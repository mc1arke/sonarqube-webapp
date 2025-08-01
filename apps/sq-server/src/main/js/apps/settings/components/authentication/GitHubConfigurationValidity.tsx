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

import { Link } from '@sonarsource/echoes-react';
import { useEffect, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import {
  FlagErrorIcon,
  FlagMessage,
  FlagSuccessIcon,
  HelperHintIcon,
  Modal,
  TextMuted,
  UnorderedList,
  Variant,
} from '~design-system';
import { translate, translateWithParameters } from '~sq-server-commons/helpers/l10n';
import { useCheckGitHubConfigQuery } from '~sq-server-commons/queries/identity-provider/github';
import { GitHubProvisioningStatus } from '~sq-server-commons/types/provisioning';
import TestConfiguration from './TestConfiguration';

const intlPrefix = 'settings.authentication.github.configuration.validation';

function ValidityIcon({ valid }: { valid: boolean }) {
  return valid ? (
    <FlagSuccessIcon aria-label={translate(`${intlPrefix}.details.valid_label`)} />
  ) : (
    <FlagErrorIcon aria-label={translate(`${intlPrefix}.details.invalid_label`)} />
  );
}

interface Props {
  isAutoProvisioning: boolean;
  selectedOrganizations: string[];
}

export default function GitHubConfigurationValidity({
  isAutoProvisioning,
  selectedOrganizations,
}: Props) {
  const [openDetails, setOpenDetails] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [alertVariant, setAlertVariant] = useState<Variant>('info');
  const { data, isFetching, refetch } = useCheckGitHubConfigQuery(true);
  const modalHeader = translate(`${intlPrefix}.details.title`);

  const applicationField = isAutoProvisioning ? 'autoProvisioning' : 'jit';

  const isValidApp =
    data?.application[applicationField].status === GitHubProvisioningStatus.Success;

  const failedOrgs = selectedOrganizations.filter((o) => {
    return !data?.installations.find((i) => i.organization === o);
  });

  useEffect(() => {
    const invalidOrgs =
      isValidApp && data
        ? data.installations.filter(
            (org) => org[applicationField].status === GitHubProvisioningStatus.Failed,
          )
        : [];

    const invalidOrgsMessages = invalidOrgs.map((org) =>
      translateWithParameters(
        `${intlPrefix}.invalid_org`,
        org.organization,
        org[applicationField].errorMessage ?? '',
      ),
    );

    if (isValidApp && invalidOrgs.length === 0) {
      setMessages([
        translateWithParameters(
          `${intlPrefix}.valid${data.installations.length === 1 ? '_one' : ''}`,
          translate(
            `settings.authentication.github.form.provisioning_with_github_short.${applicationField}`,
          ),
          data.installations.length === 1
            ? data.installations[0].organization
            : data.installations.length,
        ),
      ]);
      setAlertVariant('success');
    } else if (isValidApp && !isAutoProvisioning) {
      setMessages([translate(`${intlPrefix}.valid.short`), ...invalidOrgsMessages]);
      setAlertVariant('warning');
    } else {
      setMessages([
        translateWithParameters(
          `${intlPrefix}.invalid`,
          data?.application[applicationField].errorMessage ?? '',
        ),
        ...invalidOrgsMessages,
      ]);
      setAlertVariant('error');
    }
  }, [isFetching, isValidApp, isAutoProvisioning, applicationField, data]);

  const message = (
    <div className="sw-flex sw-items-center">
      <div>
        {messages.map((msg) => (
          <p key={msg}>{msg}</p>
        ))}
      </div>
      <div>
        <Link
          className="sw-mx-2 sw-whitespace-nowrap sw-text-center"
          highlight="current-color"
          onClick={() => {
            if (!isFetching) {
              setOpenDetails(true);
            }
          }}
        >
          <FormattedMessage id={`${intlPrefix}.details`} />
        </Link>
      </div>
    </div>
  );

  return (
    <>
      <TestConfiguration
        flagMessageContent={message}
        flagMessageTitle={messages[0]}
        flagMessageVariant={alertVariant}
        loading={isFetching}
        onTestConf={() => refetch()}
      />

      {openDetails && (
        <Modal
          body={
            <>
              {isValidApp ? (
                <FlagMessage className="sw-w-full sw-mb-2" variant="success">
                  {translate(`${intlPrefix}.valid.short`)}
                </FlagMessage>
              ) : (
                <FlagMessage className="sw-w-full sw-mb-2" variant="error">
                  {translateWithParameters(
                    `${intlPrefix}.invalid`,
                    data?.application[applicationField].errorMessage ?? '',
                  )}
                </FlagMessage>
              )}
              <UnorderedList className="sw-pl-5 sw-m-0">
                {data?.installations.map((inst) => (
                  <li className="sw-flex sw-items-center" key={inst.organization}>
                    <ValidityIcon
                      valid={inst[applicationField].status === GitHubProvisioningStatus.Success}
                    />
                    <div>
                      <span className="sw-ml-2">{inst.organization}</span>
                      {inst[applicationField].status === GitHubProvisioningStatus.Failed && (
                        <span> - {inst[applicationField].errorMessage}</span>
                      )}
                    </div>
                  </li>
                ))}
                {failedOrgs.map((fo) => (
                  <li className="sw-flex sw-items-center" key={fo}>
                    <HelperHintIcon />
                    <TextMuted
                      className="sw-ml-2"
                      text={translateWithParameters(`${intlPrefix}.details.org_not_found`, fo)}
                    />
                  </li>
                ))}
              </UnorderedList>
            </>
          }
          headerTitle={modalHeader}
          onClose={() => {
            setOpenDetails(false);
          }}
          secondaryButtonLabel={translate('close')}
        />
      )}
    </>
  );
}
