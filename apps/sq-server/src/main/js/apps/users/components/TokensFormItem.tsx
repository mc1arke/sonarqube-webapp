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
import { Button, ButtonVariety } from '@sonarsource/echoes-react';
import classNames from 'classnames';
import * as React from 'react';
import { FormattedMessage } from 'react-intl';
import { ContentCell, FlagWarningIcon, TableRow, themeColor } from '~design-system';
import DateFormatter from '~shared/components/intl/DateFormatter';
import DateFromNow from '~shared/components/intl/DateFromNow';
import ConfirmButton from '~sq-server-commons/components/controls/ConfirmButton';
import { translate, translateWithParameters } from '~sq-server-commons/helpers/l10n';
import { useRevokeTokenMutation } from '~sq-server-commons/queries/users';
import { UserToken } from '~sq-server-commons/types/token';

export type TokenDeleteConfirmation = 'inline' | 'modal';

interface Props {
  deleteConfirmation: TokenDeleteConfirmation;
  login: string;
  token: UserToken;
}

export default function TokensFormItem(props: Readonly<Props>) {
  const { token, deleteConfirmation, login } = props;
  const [showConfirmation, setShowConfirmation] = React.useState(false);
  const { mutateAsync, isPending } = useRevokeTokenMutation();

  const handleRevoke = () => mutateAsync({ login, name: token.name });

  const handleClick = () => {
    if (showConfirmation) {
      handleRevoke()
        .then(() => {
          setShowConfirmation(false);
        })
        .catch(() => {
          setShowConfirmation(false);
        });
    } else {
      setShowConfirmation(true);
    }
  };

  const className = classNames('sw-mr-2', {
    'sw-text-gray-400': token.isExpired,
  });

  return (
    <TableRow>
      <ContentCell
        className={classNames('sw-flex-col sw-items-center sw-w-64', className)}
        title={token.name}
      >
        <div className="sw-w-full sw-truncate">
          {token.name}

          {token.isExpired && (
            <StyledSpan tokenIsExpired>
              <div className="sw-mt-1">
                <FlagWarningIcon className="sw-mr-1" />

                {translate('my_account.tokens.expired')}
              </div>
            </StyledSpan>
          )}
        </div>
      </ContentCell>

      <ContentCell className={className} title={translate('users.tokens', token.type)}>
        {translate('users.tokens', token.type, 'short')}
      </ContentCell>

      <ContentCell className={classNames('sw-w-32', className)} title={token.project?.name}>
        <div className="sw-w-full sw-truncate">{token.project?.name}</div>
      </ContentCell>

      <ContentCell className={className}>
        <DateFromNow date={token.lastConnectionDate} hourPrecision />
      </ContentCell>

      <ContentCell className={className}>
        <DateFormatter date={token.createdAt} long />
      </ContentCell>

      <ContentCell className={className}>
        {token.expirationDate ? (
          <StyledSpan tokenIsExpired={token.isExpired}>
            <DateFormatter date={token.expirationDate} long />
          </StyledSpan>
        ) : (
          '–'
        )}
      </ContentCell>

      <ContentCell>
        {token.isExpired && (
          <Button
            aria-label={translateWithParameters('users.tokens.remove_label', token.name)}
            isDisabled={isPending}
            isLoading={isPending}
            onClick={handleRevoke}
            variety={ButtonVariety.DangerOutline}
          >
            {translate('remove')}
          </Button>
        )}

        {!token.isExpired && deleteConfirmation === 'modal' && (
          <ConfirmButton
            confirmButtonText={translate('yes')}
            isDestructive
            modalBody={
              <FormattedMessage
                id="users.tokens.sure_X"
                values={{ token: <strong>{token.name}</strong> }}
              />
            }
            modalHeader={translateWithParameters('users.tokens.revoke_label', token.name)}
            onConfirm={handleRevoke}
          >
            {({ onClick }) => (
              <Button
                aria-label={translateWithParameters('users.tokens.revoke_label', token.name)}
                isDisabled={isPending}
                onClick={onClick}
                variety={ButtonVariety.DangerOutline}
              >
                {translate('users.tokens.revoke')}
              </Button>
            )}
          </ConfirmButton>
        )}

        {!token.isExpired && deleteConfirmation === 'inline' && (
          <Button
            aria-label={
              showConfirmation
                ? translate('users.tokens.sure')
                : translateWithParameters('users.tokens.revoke_label', token.name)
            }
            isDisabled={isPending}
            isLoading={isPending}
            onClick={handleClick}
            variety={ButtonVariety.DangerOutline}
          >
            {showConfirmation ? translate('users.tokens.sure') : translate('users.tokens.revoke')}
          </Button>
        )}
      </ContentCell>
    </TableRow>
  );
}

const StyledSpan = styled.span<{
  tokenIsExpired?: boolean;
}>`
  color: ${({ tokenIsExpired }) =>
    tokenIsExpired ? themeColor('iconWarning') : themeColor('pageContent')};
`;
