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

import {
  Button,
  ButtonVariety,
  Form,
  Heading,
  Label,
  MessageInline,
  MessageType,
  Spinner,
} from '@sonarsource/echoes-react';
import * as React from 'react';
import { Modal } from '~design-system';
import { MetricType } from '~shared/types/metrics';
import { bulkActivateRules, bulkDeactivateRules } from '~sq-server-commons/api/quality-profiles';
import withLanguages, {
  WithLanguagesProps,
} from '~sq-server-commons/context/languages/withLanguages';
import { translate, translateWithParameters } from '~sq-server-commons/helpers/l10n';
import { formatMeasure } from '~sq-server-commons/sonar-aligned/helpers/measures';
import { CodingRulesQuery } from '~sq-server-commons/types/coding-rules';
import { BaseProfile, Profile } from '~sq-server-commons/types/quality-profiles';
import { serializeQuery } from '~sq-server-commons/utils/coding-rules-query';
import { QualityProfileSelector } from './QualityProfileSelector';

interface Props extends WithLanguagesProps {
  action: string;
  onClose: () => void;
  onSubmit?: () => void;
  profile?: BaseProfile;
  query: CodingRulesQuery;
  referencedProfiles: Record<string, BaseProfile>;
  total: number;
}

interface ActivationResult {
  failed: number;
  profile: string;
  succeeded: number;
}

interface State {
  finished: boolean;
  results: ActivationResult[];
  selectedProfiles: BaseProfile[];
  submitting: boolean;
}

export class BulkChangeModal extends React.PureComponent<Props, State> {
  mounted = false;

  constructor(props: Props) {
    super(props);

    // if there is only one possible option for profile, select it immediately
    const selectedProfiles = [];
    const availableProfiles = this.getAvailableQualityProfiles(props);
    if (availableProfiles.length === 1) {
      selectedProfiles.push(availableProfiles[0]);
    }

    this.state = {
      finished: false,
      results: [],
      selectedProfiles,
      submitting: false,
    };
  }

  componentDidMount() {
    this.mounted = true;
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  handleProfileSelect = (selectedProfiles: Profile[]) => {
    this.setState({ selectedProfiles });
  };

  getProfiles = () => {
    // if a profile is selected in the facet, pick it
    // otherwise take all profiles selected in the dropdown

    return this.props.profile
      ? [this.props.profile.key]
      : this.state.selectedProfiles.map((p) => p.key);
  };

  getAvailableQualityProfiles = ({ query, referencedProfiles } = this.props) => {
    let profiles = Object.values(referencedProfiles);
    if (query.languages.length > 0) {
      profiles = profiles.filter((profile) => query.languages.includes(profile.language));
    }
    return profiles
      .filter((profile) => profile.actions?.edit)
      .filter((profile) => !profile.isBuiltIn);
  };

  processResponse = (profile: string, response: any) => {
    if (this.mounted) {
      const result: ActivationResult = {
        failed: response.failed || 0,
        profile,
        succeeded: response.succeeded || 0,
      };
      this.setState((state) => ({ results: [...state.results, result] }));
    }
  };

  sendRequests = () => {
    let looper = Promise.resolve();

    // serialize the query, but delete the `profile`
    const data = serializeQuery(this.props.query);
    delete data.profile;

    const method = this.props.action === 'activate' ? bulkActivateRules : bulkDeactivateRules;

    const profiles = this.getProfiles();

    for (const profile of profiles) {
      looper = looper
        .then(() =>
          method({
            ...data,
            targetKey: profile,
          }),
        )
        .then((response) => {
          this.processResponse(profile, response);
        });
    }
    return looper;
  };

  handleFormSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    this.setState({ submitting: true });
    this.sendRequests().then(
      () => {
        if (this.mounted) {
          this.setState({ finished: true, submitting: false });
        }
      },
      () => {
        if (this.mounted) {
          this.setState({ submitting: false });
        }
      },
    );
  };

  handleClose = () => {
    if (this.props.onSubmit && this.state.finished) {
      this.props.onSubmit();
    }

    this.props.onClose();
  };

  renderResult = (result: ActivationResult) => {
    const { profile: profileKey } = result;
    const profile = this.props.referencedProfiles[profileKey];

    const { languages } = this.props;
    const language = languages[profile.language]
      ? languages[profile.language].name
      : profile.language;
    return (
      <MessageInline
        className="sw-mb-4"
        key={result.profile}
        type={result.failed === 0 ? MessageType.Success : MessageType.Warning}
      >
        {result.failed
          ? translateWithParameters(
              'coding_rules.bulk_change.warning',
              profile.name,
              language,
              result.succeeded,
              result.failed,
            )
          : translateWithParameters(
              'coding_rules.bulk_change.success',
              profile.name,
              language,
              result.succeeded,
            )}
      </MessageInline>
    );
  };

  renderProfileSelect = () => {
    const profiles = this.getAvailableQualityProfiles();

    const { selectedProfiles } = this.state;
    const { action } = this.props;
    const label =
      action === 'activate'
        ? translate('coding_rules.activate_in')
        : translate('coding_rules.deactivate_in');
    return (
      <>
        <Label className="sw-block sw-mb-2" htmlFor="coding-rules-bulk-change-profile-select">
          {label}
        </Label>
        <QualityProfileSelector
          inputId="coding-rules-bulk-change-profile-select"
          onChange={this.handleProfileSelect}
          profiles={profiles}
          selectedProfiles={selectedProfiles}
        />
      </>
    );
  };

  render() {
    const { action, profile, total } = this.props;
    const header =
      action === 'activate'
        ? `${translate('coding_rules.activate_in_quality_profile')} (${formatMeasure(
            total,
            MetricType.Integer,
          )} ${translate('coding_rules._rules')})`
        : `${translate('coding_rules.deactivate_in_quality_profile')} (${formatMeasure(
            total,
            MetricType.Integer,
          )} ${translate('coding_rules._rules')})`;

    const FORM_ID = `coding-rules-bulk-change-form-${action}`;

    const label =
      action === 'activate'
        ? translate('coding_rules.activate_in')
        : translate('coding_rules.deactivate_in');

    const formBody = (
      <Form id={FORM_ID} onSubmit={this.handleFormSubmit}>
        {this.state.results.map(this.renderResult)}

        {!this.state.finished && !this.state.submitting && (
          <div>
            {profile ? (
              <>
                <Heading as="h4" className="sw-mb-0">
                  {label}
                </Heading>
                <span>
                  {profile.name}
                  {' — '}
                  {translate('are_you_sure')}
                </span>
              </>
            ) : (
              this.renderProfileSelect()
            )}
          </div>
        )}
      </Form>
    );

    return (
      <Modal
        body={<Spinner isLoading={this.state.submitting}>{formBody}</Spinner>}
        headerTitle={header}
        isScrollable
        onClose={this.handleClose}
        primaryButton={
          !this.state.finished && (
            <Button
              form={FORM_ID}
              hasAutoFocus
              isDisabled={
                this.state.submitting ||
                (this.state.selectedProfiles.length === 0 && profile === undefined)
              }
              type="submit"
              variety={ButtonVariety.Primary}
            >
              {translate('apply')}
            </Button>
          )
        }
        secondaryButtonLabel={this.state.finished ? translate('close') : translate('cancel')}
      />
    );
  }
}

export default withLanguages(BulkChangeModal);
