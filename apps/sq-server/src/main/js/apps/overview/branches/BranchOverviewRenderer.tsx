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
  ButtonGroup,
  ButtonVariety,
  PromotedSection,
  PromotedSectionVariety,
} from '@sonarsource/echoes-react';
import * as React from 'react';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { CardSeparator, CenteredLayout, PageContentFontWrapper } from '~design-system';
import { useLocation, useRouter } from '~shared/components/hoc/withRouter';
import { ComponentQualifier } from '~shared/types/component';
import { MeasureEnhanced, Metric } from '~shared/types/measures';
import { addons } from '~sq-server-addons/index';
import { AnalysisStatus } from '~sq-server-commons/components/overview/AnalysisStatus';
import LastAnalysisLabel from '~sq-server-commons/components/overview/LastAnalysisLabel';
import QGStatusComponent from '~sq-server-commons/components/overview/QualityGateStatus';
import { useAvailableFeatures } from '~sq-server-commons/context/available-features/withAvailableFeatures';
import { CurrentUserContext } from '~sq-server-commons/context/current-user/CurrentUserContext';
import { parseDate } from '~sq-server-commons/helpers/dates';
import { isDiffMetric } from '~sq-server-commons/helpers/measures';
import { CodeScope } from '~sq-server-commons/helpers/urls';
import { useGetValueQuery } from '~sq-server-commons/queries/settings';
import { useDismissNoticeMutation } from '~sq-server-commons/queries/users';
import A11ySkipTarget from '~sq-server-commons/sonar-aligned/components/a11y/A11ySkipTarget';
import { ApplicationPeriod } from '~sq-server-commons/types/application';
import { Branch } from '~sq-server-commons/types/branch-like';
import { Feature } from '~sq-server-commons/types/features';
import { Analysis, GraphType, MeasureHistory } from '~sq-server-commons/types/project-activity';
import { QualityGateStatus } from '~sq-server-commons/types/quality-gates';
import { SettingsKey } from '~sq-server-commons/types/settings';
import { Component, Period, QualityGate } from '~sq-server-commons/types/types';
import { NoticeType } from '~sq-server-commons/types/users';
import { QGStatusEnum } from '~sq-server-commons/utils/overview-utils';
import ActivityPanel from './ActivityPanel';
import AICodeStatus from './AICodeStatus';
import BranchMetaTopBar from './BranchMetaTopBar';
import CaycPromotionGuide from './CaycPromotionGuide';
import FirstAnalysisNextStepsNotif from './FirstAnalysisNextStepsNotif';
import MeasuresPanelNoNewCode from './MeasuresPanelNoNewCode';
import NewCodeMeasuresPanel from './NewCodeMeasuresPanel';
import NoCodeWarning from './NoCodeWarning';
import OverallCodeMeasuresPanel from './OverallCodeMeasuresPanel';
import ReplayTourGuide from './ReplayTour';
import TabsPanel from './TabsPanel';

export interface BranchOverviewRendererProps {
  analyses?: Analysis[];
  appLeak?: ApplicationPeriod;
  branch?: Branch;
  component: Component;
  detectedCIOnLastAnalysis?: boolean;
  graph?: GraphType;
  loadingHistory?: boolean;
  loadingStatus?: boolean;
  measures?: MeasureEnhanced[];
  measuresHistory?: MeasureHistory[];
  metrics?: Metric[];
  onGraphChange: (graph: GraphType) => void;
  period?: Period;
  projectIsEmpty?: boolean;
  qgStatuses?: QualityGateStatus[];
  qualityGate?: QualityGate;
}

export default function BranchOverviewRenderer(props: Readonly<BranchOverviewRendererProps>) {
  const {
    analyses,
    appLeak,
    branch,
    component,
    detectedCIOnLastAnalysis,
    graph,
    loadingHistory,
    loadingStatus,
    measures = [],
    measuresHistory = [],
    metrics = [],
    onGraphChange,
    period,
    projectIsEmpty,
    qgStatuses,
    qualityGate,
  } = props;

  const intl = useIntl();
  const { query } = useLocation();
  const router = useRouter();

  const { currentUser } = React.useContext(CurrentUserContext);
  const { hasFeature } = useAvailableFeatures();
  const { mutateAsync: dismissNotice } = useDismissNoticeMutation();
  const { data: architectureEnabled } = useGetValueQuery({
    key: SettingsKey.DesignAndArchitecture,
  });

  const [isPromotedSectionHidden, setIsPromotedSectionHidden] = useState(false);
  const [startTour, setStartTour] = useState(false);
  const [tourCompleted, setTourCompleted] = useState(false);
  const [showReplay, setShowReplay] = useState(false);
  const [dismissedTour, setDismissedTour] = useState(
    currentUser.isLoggedIn &&
      !!currentUser.dismissedNotices[NoticeType.ONBOARDING_CAYC_BRANCH_SUMMARY_GUIDE],
  );

  const tab = query.codeScope === CodeScope.Overall ? CodeScope.Overall : CodeScope.New;
  const leakPeriod = component.qualifier === ComponentQualifier.Application ? appLeak : period;
  const isNewCodeTab = tab === CodeScope.New;
  const hasNewCodeMeasures = measures.some((m) => isDiffMetric(m.metric.key));

  const selectTab = (tab: CodeScope) => {
    router.replace({ query: { ...query, codeScope: tab } });
  };

  React.useEffect(() => {
    // Open Overall tab by default if there are no new measures.
    if (loadingStatus === false && !hasNewCodeMeasures && isNewCodeTab) {
      selectTab(CodeScope.Overall);
    }
    // In this case, we explicitly do NOT want to mark tab as a dependency, as
    // it would prevent the user from selecting it, even if it's empty.
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [loadingStatus, hasNewCodeMeasures]);

  const dismissPromotedSection = () => {
    dismissNotice(NoticeType.ONBOARDING_CAYC_BRANCH_SUMMARY_GUIDE)
      .then(() => {
        setDismissedTour(true);
        setShowReplay(true);
      })
      .catch(() => {
        /* noop */
      });
  };

  const closeTour = (action: string) => {
    setStartTour(false);
    if (action === 'skip' && !dismissedTour) {
      dismissPromotedSection();
    }

    if (action === 'close' && !dismissedTour) {
      dismissPromotedSection();
      setTourCompleted(true);
    }
  };

  const startTourGuide = () => {
    if (!isNewCodeTab) {
      selectTab(CodeScope.New);
    }
    setShowReplay(false);
    setStartTour(true);
  };

  const qgStatus = qgStatuses?.map((s) => s.status).includes('ERROR')
    ? QGStatusEnum.ERROR
    : QGStatusEnum.OK;

  return (
    <>
      <FirstAnalysisNextStepsNotif
        component={component}
        detectedCIOnLastAnalysis={detectedCIOnLastAnalysis}
      />

      {architectureEnabled?.value === 'true' &&
        hasFeature(Feature.Architecture) &&
        addons.architecture?.ArchitectureUserBanner({ projectKey: component.key })}

      <CenteredLayout>
        <PageContentFontWrapper>
          <CaycPromotionGuide closeTour={closeTour} run={startTour} />
          {showReplay && (
            <ReplayTourGuide
              closeTour={() => {
                setShowReplay(false);
              }}
              run={showReplay}
              tourCompleted={tourCompleted}
            />
          )}
          <div className="overview sw-my-6 sw-typo-default">
            <A11ySkipTarget anchor="overview_main" />

            {projectIsEmpty ? (
              <NoCodeWarning branchLike={branch} component={component} measures={measures} />
            ) : (
              <div>
                {branch && (
                  <>
                    <BranchMetaTopBar
                      branch={branch}
                      component={component}
                      measures={measures}
                      showTakeTheTourButton={
                        dismissedTour && currentUser.isLoggedIn && hasNewCodeMeasures
                      }
                      startTour={startTourGuide}
                    />

                    <CardSeparator />

                    {currentUser.isLoggedIn &&
                      hasNewCodeMeasures &&
                      !dismissedTour &&
                      !isPromotedSectionHidden && (
                        <PromotedSection
                          actions={
                            <ButtonGroup>
                              <Button
                                onClick={() => {
                                  setIsPromotedSectionHidden(true);
                                  startTourGuide();
                                }}
                                variety={ButtonVariety.Primary}
                              >
                                {intl.formatMessage({
                                  id: 'overview.promoted_section.button_primary',
                                })}
                              </Button>

                              <Button onClick={dismissPromotedSection}>
                                {intl.formatMessage({
                                  id: 'overview.promoted_section.button_secondary',
                                })}
                              </Button>
                            </ButtonGroup>
                          }
                          className="sw-my-6"
                          headerText={intl.formatMessage({
                            id: 'overview.promoted_section.title',
                          })}
                          onDismiss={dismissPromotedSection}
                          text={intl.formatMessage({ id: 'overview.promoted_section.content' })}
                          variety={PromotedSectionVariety.Highlight}
                        />
                      )}
                  </>
                )}
                <div
                  className="sw-flex sw-justify-between sw-items-start sw-my-6"
                  data-testid="overview__quality-gate-panel"
                >
                  <div className="sw-flex sw-items-center">
                    <QGStatusComponent status={qgStatus} />
                    <AICodeStatus branch={branch} component={component} />
                  </div>
                  <LastAnalysisLabel analysisDate={branch?.analysisDate} />
                </div>
                <AnalysisStatus component={component} />
                <div className="sw-flex sw-flex-col sw-mt-6">
                  <TabsPanel
                    analyses={analyses}
                    component={component}
                    isNewCode={isNewCodeTab}
                    loading={loadingStatus}
                    onTabSelect={selectTab}
                    qgStatuses={qgStatuses}
                  >
                    {isNewCodeTab && (
                      <>
                        {hasNewCodeMeasures ? (
                          <NewCodeMeasuresPanel
                            appLeak={appLeak}
                            branch={branch}
                            component={component}
                            loading={loadingStatus}
                            measures={measures}
                            period={period}
                            qgStatuses={qgStatuses}
                            qualityGate={qualityGate}
                          />
                        ) : (
                          <MeasuresPanelNoNewCode
                            branch={branch}
                            component={component}
                            period={period}
                          />
                        )}
                      </>
                    )}

                    {!isNewCodeTab && (
                      <OverallCodeMeasuresPanel
                        branch={branch}
                        component={component}
                        loading={loadingStatus}
                        measures={measures}
                        qgStatuses={qgStatuses}
                        qualityGate={qualityGate}
                      />
                    )}
                  </TabsPanel>

                  <ActivityPanel
                    analyses={analyses}
                    branchLike={branch}
                    component={component}
                    graph={graph}
                    leakPeriodDate={leakPeriod && parseDate(leakPeriod.date)}
                    loading={loadingHistory}
                    measuresHistory={measuresHistory}
                    metrics={metrics}
                    onGraphChange={onGraphChange}
                  />
                </div>
              </div>
            )}
          </div>
        </PageContentFontWrapper>
      </CenteredLayout>
    </>
  );
}
