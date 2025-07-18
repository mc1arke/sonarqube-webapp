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
  Modal,
  ModalSize,
  Spotlight,
  SpotlightCallbackProps,
  SpotlightModalPlacement,
  SpotlightStep,
} from '@sonarsource/echoes-react';
import { debounce } from 'lodash';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Image } from '~adapters/components/common/Image';
import { dismissNotice } from '~sq-server-commons/api/users';
import DocumentationLink from '~sq-server-commons/components/common/DocumentationLink';
import { useAppState } from '~sq-server-commons/context/app-state/withAppStateContext';
import { CurrentUserContext } from '~sq-server-commons/context/current-user/CurrentUserContext';
import { CustomEvents } from '~sq-server-commons/helpers/constants';
import { DocLink } from '~sq-server-commons/helpers/doc-links';
import { useStandardExperienceModeQuery } from '~sq-server-commons/queries/mode';
import { EditionKey } from '~sq-server-commons/types/editions';
import { Permissions } from '~sq-server-commons/types/permissions';
import { NoticeType } from '~sq-server-commons/types/users';

const MAX_STEPS = 4;

export default function ModeTour() {
  const { currentUser, updateDismissedNotices } = useContext(CurrentUserContext);
  const appState = useAppState();
  const intl = useIntl();
  const { data: isStandardMode } = useStandardExperienceModeQuery();
  const [step, setStep] = useState(1);
  const [runManually, setRunManually] = useState(false);

  const dismissedTour = currentUser.dismissedNotices[NoticeType.MODE_TOUR];

  const nextStep = (next?: number) => {
    if (step === MAX_STEPS || next === 5) {
      document.dispatchEvent(new CustomEvent(CustomEvents.OpenHelpMenu));

      setTimeout(() => {
        setStep(5);
      });
    } else {
      setStep(next ?? step + 1);
    }
  };

  const dismissTourWithDebounce = useMemo(
    () =>
      debounce(() => {
        dismissNotice(NoticeType.MODE_TOUR)
          .then(() => {
            updateDismissedNotices(NoticeType.MODE_TOUR, true);
          })
          .catch(() => {
            /* noop */
          });
      }, 500),
    [updateDismissedNotices],
  );

  const dismissTour = useCallback(() => {
    document.dispatchEvent(new CustomEvent(CustomEvents.CloseHelpMenu));
    setStep(6);

    if (!dismissedTour) {
      dismissTourWithDebounce();
    }
  }, [dismissedTour, dismissTourWithDebounce]);

  const onLater = () => {
    nextStep(5);
  };

  const onToggle = (props: SpotlightCallbackProps) => {
    switch (props.action) {
      case 'close':
      case 'skip':
      case 'reset':
        // ideally we should trigger onLater here, but the spotlight will be closed on close/skip/reset.
        // So it is not possible without a dirty hack.
        dismissTour();
        break;

      case 'next':
        if (props.lifecycle === 'complete') {
          nextStep();
        }
        break;

      default:
        break;
    }
  };

  useEffect(() => {
    const listener = () => {
      setStep(1);
      setRunManually(true);
    };

    document.addEventListener(CustomEvents.RunTourMode, listener);

    return () => {
      document.removeEventListener(CustomEvents.RunTourMode, listener);
    };
  }, []);

  useEffect(() => {
    const listener = () => {
      // dismiss tour if help menu is closed and user has not completed all steps
      if (step >= MAX_STEPS) {
        dismissTour();
      }
    };

    document.addEventListener(CustomEvents.HelpMenuClosed, listener);

    return () => {
      document.removeEventListener(CustomEvents.HelpMenuClosed, listener);
    };
  }, [dismissTour, step]);

  const isAdmin = currentUser.permissions?.global.includes(Permissions.Admin);

  const isAdminOrQGAdmin =
    isAdmin || currentUser.permissions?.global.includes(Permissions.QualityGateAdmin);

  useEffect(() => {
    if (currentUser.isLoggedIn && !isAdminOrQGAdmin && !dismissedTour) {
      dismissTour();
    }
  }, [currentUser.isLoggedIn, isAdminOrQGAdmin, dismissedTour, dismissTour]);

  if (!runManually && (currentUser.dismissedNotices[NoticeType.MODE_TOUR] || !isAdminOrQGAdmin)) {
    return null;
  }

  const steps: SpotlightStep[] = [
    ...(isAdmin
      ? [
          {
            bodyText: intl.formatMessage(
              { id: 'mode_tour.step4.description' },
              {
                b: (text) => <b>{text}</b>,
                mode: intl.formatMessage({
                  id: `settings.mode.${isStandardMode ? 'standard' : 'mqr'}.name`,
                }),
                p: (text) => <p className="sw-mt-2">{text}</p>,
                p1: (text) => <p>{text}</p>,
              },
            ),
            headerText: <FormattedMessage id="mode_tour.step4.title" />,
            placement: SpotlightModalPlacement.Bottom,
            target: '[data-guiding-id="mode-tour-1"]',
          },
        ]
      : []),
    {
      bodyText: '',
      headerText: <FormattedMessage id="mode_tour.step5.title" />,
      placement: SpotlightModalPlacement.Left,
      target: '[data-guiding-id="mode-tour-2"]',
    },
  ];

  const maxModalSteps = isAdmin ? MAX_STEPS - 1 : MAX_STEPS;

  return (
    <>
      <Modal
        content={
          <>
            {step <= maxModalSteps && (
              <>
                <Image
                  alt={intl.formatMessage({ id: `mode_tour.step${step}.img_alt` })}
                  className="sw-w-full sw-mb-4"
                  src={`/images/mode-tour/step${isStandardMode && step === 4 ? step + '_se' : step}.png`}
                />

                {intl.formatMessage(
                  {
                    id: `mode_tour.step${step}.description`,
                  },
                  {
                    b: (text) => <b>{text}</b>,
                    mode: intl.formatMessage({
                      id: `settings.mode.${isStandardMode ? 'standard' : 'mqr'}.name`,
                    }),
                    p: (text) => <p className="sw-mt-4">{text}</p>,
                    p1: (text) => <p>{text}</p>,
                  },
                )}

                <div className="sw-mt-6">
                  <b>
                    {intl.formatMessage({ id: 'guiding.step_x_of_y' }, { 0: step, 1: MAX_STEPS })}
                  </b>
                </div>
              </>
            )}
          </>
        }
        footerLink={
          <DocumentationLink standalone to={DocLink.ModeMQR}>
            <FormattedMessage id="mode_tour.link" />
          </DocumentationLink>
        }
        isOpen={step <= maxModalSteps}
        onOpenChange={(isOpen) => {
          if (isOpen === false) {
            onLater();
          }
        }}
        primaryButton={
          <Button
            onClick={() => {
              nextStep();
            }}
            variety={ButtonVariety.Primary}
          >
            <FormattedMessage id={step === 1 ? 'lets_go' : 'next'} />
          </Button>
        }
        secondaryButton={
          step === 1 && (
            <Button onClick={onLater} variety={ButtonVariety.Default}>
              <FormattedMessage id="later" />
            </Button>
          )
        }
        size={ModalSize.Wide}
        title={
          step <= maxModalSteps &&
          intl.formatMessage(
            { id: `mode_tour.step${step}.title` },
            { isCommunityBuild: appState.edition === EditionKey.community },
          )
        }
      />
      <Spotlight
        backLabel=""
        callback={onToggle}
        closeLabel={intl.formatMessage({ id: 'got_it' })}
        isRunning={step > maxModalSteps}
        stepIndex={step - maxModalSteps - 1}
        stepXofYLabel={(x: number) =>
          x + maxModalSteps <= MAX_STEPS
            ? intl.formatMessage(
                { id: 'guiding.step_x_of_y' },
                { 0: x + maxModalSteps, 1: MAX_STEPS },
              )
            : ''
        }
        steps={steps}
      />
    </>
  );
}
