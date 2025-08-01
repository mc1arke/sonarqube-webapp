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

import { Button, ButtonVariety } from '@sonarsource/echoes-react';
import { useState } from 'react';
import { throwGlobalError } from '~adapters/helpers/error';
import { Spinner, Title } from '~design-system';
import { withRouter } from '~shared/components/hoc/withRouter';
import { Router } from '~shared/types/router';
import { createPermissionTemplate } from '~sq-server-commons/api/permissions';
import { translate } from '~sq-server-commons/helpers/l10n';
import { PERMISSION_TEMPLATES_PATH } from '../utils';
import Form from './Form';
import ProvisioningWarning from './ProvisioningWarning';

interface Props {
  ready?: boolean;
  refresh: () => Promise<void>;
  router: Router;
}

function Header(props: Props) {
  const { ready, router } = props;
  const [createModal, setCreateModal] = useState(false);

  const handleCreateModalSubmit = async (data: {
    description: string;
    name: string;
    projectKeyPattern: string;
  }) => {
    try {
      const response = await createPermissionTemplate({ ...data });
      await props.refresh();
      router.push({
        pathname: PERMISSION_TEMPLATES_PATH,
        query: { id: response.permissionTemplate.id },
      });
    } catch (e) {
      throwGlobalError(e);
    }
  };

  return (
    <header>
      <div id="project-permissions-header">
        <div className="sw-flex sw-justify-between">
          <div className="sw-flex sw-gap-3">
            <Title>{translate('permission_templates.page')}</Title>
            <Spinner className="sw-mt-2" loading={!ready} />
          </div>

          <Button
            onClick={() => {
              setCreateModal(true);
            }}
            variety={ButtonVariety.Primary}
          >
            {translate('create')}
          </Button>
        </div>
        <div className="sw-mb-4">{translate('permission_templates.page.description')}</div>
      </div>
      <ProvisioningWarning />

      {createModal && (
        <Form
          confirmButtonText={translate('create')}
          header={translate('permission_template.new_template')}
          onClose={() => {
            setCreateModal(false);
          }}
          onSubmit={handleCreateModalSubmit}
        />
      )}
    </header>
  );
}

export default withRouter(Header);
