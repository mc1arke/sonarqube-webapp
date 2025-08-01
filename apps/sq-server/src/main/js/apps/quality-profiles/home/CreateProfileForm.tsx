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
  Form,
  FormFieldWidth,
  MessageCallout,
  MessageType,
  ModalForm,
  Select,
  SelectionCards,
  Text,
  TextInput,
} from '@sonarsource/echoes-react';
import { sortBy } from 'lodash';
import * as React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { FileInput, FormField, Note } from '~design-system';
import { Location } from '~shared/types/router';
import {
  changeProfileParent,
  copyProfile,
  createQualityProfile,
  getImporters,
} from '~sq-server-commons/api/quality-profiles';
import { translate } from '~sq-server-commons/helpers/l10n';
import { parseAsOptionalString } from '~sq-server-commons/helpers/query';
import { useProfileInheritanceQuery } from '~sq-server-commons/queries/quality-profiles';
import { Profile, ProfileActionModals } from '~sq-server-commons/types/quality-profiles';

interface Props {
  children: React.ReactNode;
  languages: Array<{ key: string; name: string }>;
  location: Location;
  onCreate: Function;
  profiles: Profile[];
}

export default function CreateProfileForm(props: Readonly<Props>) {
  const { children, languages, profiles, onCreate } = props;

  const intl = useIntl();

  const [importers, setImporters] = React.useState<
    Array<{ key: string; languages: string[]; name: string }>
  >([]);

  type ActionOptions = ProfileActionModals.Copy | ProfileActionModals.Extend | 'blank';

  const [action, setAction] = React.useState<ActionOptions>('blank');
  const [submitting, setSubmitting] = React.useState(false);
  const [name, setName] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [language, setLanguage] = React.useState<string>();
  const [isValidLanguage, setIsValidLanguage] = React.useState<boolean>();
  const [isValidName, setIsValidName] = React.useState<boolean>();
  const [isValidProfile, setIsValidProfile] = React.useState<boolean>();
  const [profile, setProfile] = React.useState<Profile>();

  const fetchImporters = React.useCallback(async () => {
    setLoading(true);
    try {
      const importers = await getImporters();
      setImporters(importers);
    } finally {
      setLoading(false);
    }
  }, [setImporters, setLoading]);

  const handleNameChange = React.useCallback(
    (event: React.SyntheticEvent<HTMLInputElement>) => {
      setName(event.currentTarget.value);
      setIsValidName(event.currentTarget.value.length > 0);
    },
    [setName, setIsValidName],
  );

  const handleLanguageChange = React.useCallback(
    (option: string) => {
      setLanguage(option);
      setIsValidLanguage(true);
      setProfile(undefined);
      setIsValidProfile(false);
    },
    [setLanguage, setIsValidLanguage],
  );

  const handleFormSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      setSubmitting(true);
      const profileKey = profile?.key;
      try {
        if (action === ProfileActionModals.Copy && profileKey && name) {
          const profile = await copyProfile(profileKey, name);
          onCreate(profile);
        } else if (action === ProfileActionModals.Extend) {
          const { profile } = await createQualityProfile({ language, name });

          const parentProfile = profiles.find((p) => p.key === profileKey);
          if (parentProfile) {
            await changeProfileParent(profile, parentProfile);
          }

          onCreate(profile);
        } else {
          const formData = new FormData(event?.currentTarget ?? undefined);
          formData.set('language', language ?? '');
          formData.set('name', name);
          const { profile } = await createQualityProfile(formData);
          onCreate(profile);
        }
      } finally {
        setSubmitting(false);
      }
    },
    [setSubmitting, onCreate, profiles, action, language, name, profile],
  );

  React.useEffect(() => {
    fetchImporters();
    const languageQueryFilter = parseAsOptionalString(props.location.query.language);
    if (languageQueryFilter !== undefined) {
      setLanguage(languageQueryFilter);
      setIsValidLanguage(true);
    }
  }, [fetchImporters, props.location.query.language]);

  const { data: { ancestors } = {}, isLoading } = useProfileInheritanceQuery(
    action === undefined || language === undefined || profile === undefined
      ? undefined
      : {
          language,
          name: profile.name,
        },
  );

  const extendsBuiltIn = ancestors?.some((p) => p.isBuiltIn);
  const showBuiltInWarning =
    action === 'blank' ||
    (action === ProfileActionModals.Copy && !extendsBuiltIn && profile !== undefined) ||
    (action === ProfileActionModals.Extend &&
      !extendsBuiltIn &&
      profile !== undefined &&
      !profile.isBuiltIn);
  const canSubmit =
    (action === 'blank' && isValidName && isValidLanguage) ||
    (action !== 'blank' && isValidLanguage && isValidName && isValidProfile);
  const header = intl.formatMessage({ id: 'quality_profiles.new_profile' });

  const languageQueryFilter = parseAsOptionalString(props.location.query.language);
  const selectedLanguage = language ?? languageQueryFilter;
  const filteredImporters = selectedLanguage
    ? importers.filter((importer) => importer.languages.includes(selectedLanguage))
    : [];

  const profilesForSelectedLanguage = profiles.filter((p) => p.language === selectedLanguage);
  const profileOptions = sortBy(profilesForSelectedLanguage, 'name').map((profile) => ({
    ...profile,
    label: profile.isBuiltIn
      ? `${profile.name} (${intl.formatMessage({ id: 'quality_profiles.built_in' })})`
      : profile.name,
    value: profile.key,
  }));

  const handleQualityProfileChange = React.useCallback(
    (option: string) => {
      const selectedProfile = profileOptions.find((p) => p.key === option);
      setProfile(selectedProfile);
      setIsValidProfile(selectedProfile !== undefined);
    },
    [setProfile, setIsValidProfile, profileOptions],
  );

  const languagesOptions = sortBy(languages, 'name').map((l) => ({
    label: l.name,
    value: l.key,
  }));

  return (
    <ModalForm
      content={
        <>
          <Form.Section>
            <Text isSubdued>
              <FormattedMessage id="quality_profiles.chose_creation_type" />
            </Text>
            <SelectionCards
              ariaLabel={intl.formatMessage({ id: 'quality_profiles.chose_creation_type' })}
              onChange={(v) => {
                setAction(v as ActionOptions);
              }}
              options={[
                {
                  value: ProfileActionModals.Extend,
                  label: intl.formatMessage({ id: 'quality_profiles.creation_from_extend' }),
                  helpText: (
                    <>
                      <p className="sw-mb-2">
                        {intl.formatMessage({
                          id: 'quality_profiles.creation_from_extend_description_1',
                        })}
                      </p>
                      <p>
                        {intl.formatMessage({
                          id: 'quality_profiles.creation_from_extend_description_2',
                        })}
                      </p>
                    </>
                  ),
                },
                {
                  value: ProfileActionModals.Copy,
                  label: intl.formatMessage({ id: 'quality_profiles.creation_from_copy' }),
                  helpText: (
                    <>
                      <p className="sw-mb-2">
                        {intl.formatMessage({
                          id: 'quality_profiles.creation_from_copy_description_1',
                        })}
                      </p>
                      <p>
                        {intl.formatMessage({
                          id: 'quality_profiles.creation_from_copy_description_2',
                        })}
                      </p>
                    </>
                  ),
                },
                {
                  value: 'blank',
                  label: intl.formatMessage({ id: 'quality_profiles.creation_from_blank' }),
                  helpText: intl.formatMessage({
                    id: 'quality_profiles.creation_from_blank_description',
                  }),
                },
              ]}
              value={action}
            />

            {!isLoading && showBuiltInWarning && (
              <MessageCallout
                className="sw-block sw-my-4"
                text={
                  <div className="sw-flex sw-flex-col">
                    {intl.formatMessage({
                      id: 'quality_profiles.no_built_in_updates_warning.new_profile',
                    })}
                    <span className="sw-mt-1">
                      {intl.formatMessage({
                        id: 'quality_profiles.no_built_in_updates_warning.new_profile.2',
                      })}
                    </span>
                  </div>
                }
                type={MessageType.Info}
              />
            )}
            <Select
              className="sw-mb-4"
              data={languagesOptions}
              id="create-profile-language-input"
              isRequired
              isSearchable
              label={intl.formatMessage({ id: 'language' })}
              name="language"
              onChange={handleLanguageChange}
              value={selectedLanguage}
            />

            {action !== 'blank' && (
              <Select
                ariaLabel={intl.formatMessage({
                  id:
                    action === ProfileActionModals.Copy
                      ? 'quality_profiles.creation.choose_copy_quality_profile'
                      : 'quality_profiles.creation.choose_parent_quality_profile',
                })}
                className="sw-mb-4"
                data={profileOptions}
                id="create-profile-parent-input"
                isRequired
                isSearchable
                label={intl.formatMessage({ id: 'quality_profiles.parent' })}
                name="parentKey"
                onChange={handleQualityProfileChange}
                value={profile?.key}
              />
            )}
            <TextInput
              autoFocus
              id="create-profile-name"
              isRequired
              label={intl.formatMessage({ id: 'name' })}
              maxLength={50}
              name="name"
              onChange={handleNameChange}
              type="text"
              value={name}
              width={FormFieldWidth.Full}
            />
          </Form.Section>
          {action === 'blank' && (
            <Form.Section>
              {filteredImporters.map((importer) => (
                <FormField
                  htmlFor={'create-profile-form-backup-' + importer.key}
                  key={importer.key}
                  label={importer.name}
                >
                  <FileInput
                    chooseLabel={intl.formatMessage({ id: 'choose_file' })}
                    clearLabel={intl.formatMessage({ id: 'clear_file' })}
                    id={`create-profile-form-backup-${importer.key}`}
                    name={`backup_${importer.key}`}
                    noFileLabel={intl.formatMessage({ id: 'no_file_selected' })}
                  />
                  <Note>
                    {intl.formatMessage({ id: 'quality_profiles.optional_configuration_file' })}
                  </Note>
                </FormField>
              ))}
            </Form.Section>
          )}
        </>
      }
      isSubmitDisabled={!canSubmit || submitting || loading}
      onSubmit={handleFormSubmit}
      secondaryButtonLabel={intl.formatMessage({ id: 'cancel' })}
      submitButtonLabel={translate('create')}
      title={header}
    >
      {children}
    </ModalForm>
  );
}
