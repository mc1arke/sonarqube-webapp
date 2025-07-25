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

import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { ButtonIcon, ButtonVariety, IconUnfold } from '@sonarsource/echoes-react';
import classNames from 'classnames';
import * as React from 'react';
import { useCurrentBranchQuery } from '~adapters/queries/branch';
import { ClipboardIconButton } from '~shared/components/clipboard';
import { getBranchLikeQuery } from '~shared/helpers/branch-like';
import { ComponentQualifier } from '~shared/types/component';
import { ComponentContext } from '../../../context/componentContext/ComponentContext';
import { useCurrentUser } from '../../../context/current-user/CurrentUserContext';
import {
  ChevronRightIcon,
  HoverLink,
  LightLabel,
  Link,
  Spinner,
  themeColor,
} from '../../../design-system';
import { translate } from '../../../helpers/l10n';
import { collapsedDirFromPath, fileFromPath } from '../../../helpers/path';
import { getBranchLikeUrl } from '../../../helpers/urls';
import { getComponentIssuesUrl } from '../../../sonar-aligned/helpers/urls';
import { SourceViewerFile } from '../../../types/types';
import { isLoggedIn } from '../../../types/users';
import { DEFAULT_ISSUES_QUERY } from '../../shared/utils';
import { IssueOpenInIdeButton } from '../IssueOpenInIdeButton';

export const INTERACTIVE_TOOLTIP_DELAY = 0.5;

export interface Props {
  className?: string;
  displayProjectName?: boolean;
  expandable?: boolean;
  issueKey: string;
  linkToProject?: boolean;
  loading?: boolean;
  onExpand?: () => void;
  secondaryActions?: React.ReactNode;
  shouldShowOpenInIde?: boolean;
  shouldShowViewAllIssues?: boolean;
  sourceViewerFile: SourceViewerFile;
}

export function IssueSourceViewerHeader(props: Readonly<Props>) {
  const {
    className,
    displayProjectName = true,
    expandable,
    issueKey,
    linkToProject = true,
    loading,
    onExpand,
    sourceViewerFile,
    shouldShowOpenInIde = true,
    shouldShowViewAllIssues = true,
    secondaryActions,
  } = props;

  const { measures, path, project, projectName, q } = sourceViewerFile;

  const { component } = React.useContext(ComponentContext);
  const { data: branchLike, isLoading: isLoadingBranches } = useCurrentBranchQuery(
    component ?? {
      key: project,
      name: projectName,
      qualifier: ComponentQualifier.Project,
    },
  );
  const { currentUser } = useCurrentUser();
  const theme = useTheme();

  const isProjectRoot = q === ComponentQualifier.Project;

  const borderColor = themeColor('codeLineBorder')({ theme });

  const IssueSourceViewerStyle = styled.section`
    border: 1px solid ${borderColor};
    border-bottom: none;
  `;

  return (
    <IssueSourceViewerStyle
      aria-label={sourceViewerFile.path}
      className={classNames(
        'sw-flex sw-justify-space-between sw-items-center sw-px-4 sw-py-3 sw-text-sm',
        className,
      )}
    >
      <div className="sw-flex-1">
        {displayProjectName && (
          <>
            {linkToProject ? (
              <LightLabel>
                <HoverLink className="sw-mr-2" to={getBranchLikeUrl(project, branchLike)}>
                  {projectName}
                </HoverLink>
              </LightLabel>
            ) : (
              <LightLabel className="sw-ml-1 sw-mr-2">{projectName}</LightLabel>
            )}
          </>
        )}

        {!isProjectRoot && (
          <span className="sw-whitespace-nowrap">
            {displayProjectName && <ChevronRightIcon className="sw-mr-2" />}

            <LightLabel>
              {collapsedDirFromPath(path)}
              {fileFromPath(path)}
            </LightLabel>
            <ClipboardIconButton
              className="sw-h-6 sw-mx-2"
              copyLabel={translate('source_viewer.click_to_copy_filepath')}
              copyValue={path}
            />
          </span>
        )}
      </div>

      {!isProjectRoot && shouldShowOpenInIde && isLoggedIn(currentUser) && !isLoadingBranches && (
        <IssueOpenInIdeButton
          branchLike={branchLike}
          issueKey={issueKey}
          login={currentUser.login}
          projectKey={project}
        />
      )}

      {secondaryActions && <div>{secondaryActions}</div>}

      {!isProjectRoot && shouldShowViewAllIssues && measures.issues !== undefined && (
        <div
          className={classNames('sw-ml-4', {
            'sw-mr-1': (!expandable || loading) ?? isLoadingBranches,
          })}
        >
          <Link
            to={getComponentIssuesUrl(project, {
              ...getBranchLikeQuery(branchLike),
              files: path,
              ...DEFAULT_ISSUES_QUERY,
            })}
          >
            {translate('source_viewer.view_all_issues')}
          </Link>
        </div>
      )}

      <Spinner className="sw-mr-1" loading={loading ?? isLoadingBranches} />

      {expandable && !(loading ?? isLoadingBranches) && (
        <div className="sw-ml-4">
          <ButtonIcon
            Icon={IconUnfold}
            ariaLabel={translate('source_viewer.expand_all_lines')}
            onClick={onExpand}
            variety={ButtonVariety.PrimaryGhost}
          />
        </div>
      )}
    </IssueSourceViewerStyle>
  );
}
