/*
 * SonarQube
 * Copyright (C) 2009-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

import styled from '@emotion/styled';
import { Button, ButtonVariety, Checkbox } from '@sonarsource/echoes-react';
import { useCallback, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { InputSearch, LightPrimary, themeBorder, themeColor } from '~design-system';
import ListFooter from '~shared/components/controls/ListFooter';
import { getBaseUrl } from '~sq-server-commons/helpers/system';
import { GithubRepository, GitlabProject } from '~sq-server-commons/types/alm-integration';
import { AlmKeys } from '~sq-server-commons/types/alm-settings';
import { Paging } from '~sq-server-commons/types/types';
import AlmRepoItem from '../components/AlmRepoItem';

interface RepositoryListProps {
  almKey: AlmKeys.GitHub | AlmKeys.GitLab;
  checkAll: () => void;
  loadingRepositories: boolean;
  onCheck: (key: string) => void;
  onImport: () => void;
  onLoadMore: () => void;
  onSearch: (query: string) => void;
  repositories?: GithubRepository[] | GitlabProject[];
  repositoryPaging: Paging;
  searchQuery: string;
  selected: Set<string>;
  uncheckAll: () => void;
}

export default function RepositoryList(props: Readonly<RepositoryListProps>) {
  const {
    almKey,
    checkAll,
    loadingRepositories,
    onCheck,
    onImport,
    onLoadMore,
    onSearch,
    repositories,
    repositoryPaging,
    searchQuery,
    selected,
    uncheckAll,
  } = props;

  const { formatMessage } = useIntl();

  const areAllRepositoriesChecked = useMemo(() => {
    const nonImportedRepos = repositories?.filter((r) => r.sqProjectKey === undefined) ?? [];
    return nonImportedRepos.length > 0 && selected.size === nonImportedRepos.length;
  }, [repositories, selected.size]);

  const onCheckAllRepositories = useCallback(() => {
    if (areAllRepositoriesChecked) {
      uncheckAll();
    } else {
      checkAll();
    }
  }, [areAllRepositoriesChecked, checkAll, uncheckAll]);

  if (!repositories) {
    return null;
  }

  return (
    <div className="sw-flex sw-gap-12">
      <LargeColumn>
        <div className="sw-mb-2 sw-py-2 sw-flex sw-items-center sw-justify-between sw-w-full">
          <div>
            <Checkbox
              checked={areAllRepositoriesChecked}
              className="sw-ml-5"
              isDisabled={repositories.length === 0}
              label={formatMessage({ id: 'onboarding.create_project.select_all_repositories' })}
              onCheck={onCheckAllRepositories}
            />
          </div>
          <InputSearch
            loading={loadingRepositories}
            onChange={onSearch}
            placeholder={formatMessage({ id: 'onboarding.create_project.search_repositories' })}
            size="medium"
            value={searchQuery}
          />
        </div>

        {repositories.length === 0 ? (
          <div className="sw-py-6 sw-px-2">
            <LightPrimary className="sw-typo-default">
              {formatMessage({ id: 'no_results' })}
            </LightPrimary>
          </div>
        ) : (
          <ul className="sw-flex sw-flex-col sw-gap-3">
            {repositories.map(({ id, name, sqProjectKey, url, ...repo }) => (
              <AlmRepoItem
                almIconSrc={`${getBaseUrl()}/images/alm/${almKey}.svg`}
                almKey={almKey === AlmKeys.GitHub ? (repo as GithubRepository).key : id}
                almUrl={url}
                almUrlText={formatMessage(
                  { id: 'onboarding.create_project.see_on' },
                  { almName: formatMessage({ id: `alm.${almKey}` }) },
                )}
                key={id}
                multiple
                onCheck={(key: string) => {
                  onCheck(key);
                }}
                primaryTextNode={<span title={name}>{name}</span>}
                selected={selected.has(
                  almKey === AlmKeys.GitHub ? (repo as GithubRepository).key : id,
                )}
                sqProjectKey={sqProjectKey}
              />
            ))}
          </ul>
        )}

        <ListFooter
          className="sw-mb-10"
          count={repositories.length}
          loadMore={onLoadMore}
          loading={loadingRepositories}
          total={repositoryPaging.total}
        />
      </LargeColumn>
      <SideColumn>
        {selected.size > 0 && (
          <SetupBox className="sw-rounded-2 sw-p-8 sw-mb-0">
            <SetupBoxTitle className="sw-mb-2 sw-heading-lg">
              <FormattedMessage
                id="onboarding.create_project.x_repositories_selected"
                values={{ count: selected.size }}
              />
            </SetupBoxTitle>
            <div>
              <SetupBoxContent className="sw-pb-4">
                <FormattedMessage
                  id="onboarding.create_project.x_repository_created"
                  values={{ count: selected.size }}
                />
              </SetupBoxContent>
              <div className="sw-mt-4">
                <Button
                  className="js-set-up-projects"
                  onClick={onImport}
                  variety={ButtonVariety.Primary}
                >
                  {formatMessage({ id: 'onboarding.create_project.import' })}
                </Button>
              </div>
            </div>
          </SetupBox>
        )}
      </SideColumn>
    </div>
  );
}

const LargeColumn = styled.div`
  flex: 6;
`;

const SideColumn = styled.div`
  flex: 4;
`;

const SetupBox = styled.form`
  max-height: 280px;
  background: ${themeColor('highlightedSection')};
  border: ${themeBorder('default', 'highlightedSectionBorder')};
`;

const SetupBoxTitle = styled.h2`
  color: ${themeColor('pageTitle')};
`;

const SetupBoxContent = styled.div`
  border-bottom: ${themeBorder('default')};
`;
