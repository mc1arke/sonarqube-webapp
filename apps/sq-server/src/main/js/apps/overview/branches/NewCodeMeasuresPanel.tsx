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
import { RatingBadgeSize, Text, TextSize } from '@sonarsource/echoes-react';
import { isEmpty } from 'lodash';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  LightLabel,
  NoDataIcon,
  SnoozeCircleIcon,
  TextError,
  TrendUpCircleIcon,
  getTabPanelId,
  themeColor,
} from '~design-system';
import { MetricKey, MetricType } from '~shared/types/metrics';
import { getLeakValue } from '~sq-server-commons/components/measure/utils';
import {
  GridContainer,
  StyleMeasuresCard,
  StyleMeasuresCardRightBorder,
  StyledConditionsCard,
} from '~sq-server-commons/components/overview/BranchSummaryStyles';
import { IssueMeasuresCardInner } from '~sq-server-commons/components/overview/IssueMeasuresCardInner';
import MeasuresCardNumber from '~sq-server-commons/components/overview/MeasuresCardNumber';
import MeasuresCardPercent from '~sq-server-commons/components/overview/MeasuresCardPercent';
import { DEFAULT_ISSUES_QUERY } from '~sq-server-commons/components/shared/utils';
import RatingComponent from '~sq-server-commons/context/metrics/RatingComponent';
import { findMeasure, isDiffMetric } from '~sq-server-commons/helpers/measures';

import { getBranchLikeQuery } from '~shared/helpers/branch-like';
import { isApplication } from '~shared/helpers/component';
import { MeasureEnhanced } from '~shared/types/measures';
import { MeasuresCardDependencyRisk } from '~sq-server-commons/components/overview/MeasuresCardDependencyRisk';
import { CodeScope, getComponentDrilldownUrl } from '~sq-server-commons/helpers/urls';
import { formatMeasure } from '~sq-server-commons/sonar-aligned/helpers/measures';
import {
  getComponentIssuesUrl,
  getComponentSecurityHotspotsUrl,
} from '~sq-server-commons/sonar-aligned/helpers/urls';
import { ApplicationPeriod } from '~sq-server-commons/types/application';
import { Branch } from '~sq-server-commons/types/branch-like';
import { IssueStatus } from '~sq-server-commons/types/issues';
import { QualityGateStatus } from '~sq-server-commons/types/quality-gates';
import { CaycStatus, Component, Period, QualityGate } from '~sq-server-commons/types/types';
import {
  MeasurementType,
  QGStatusEnum,
  getConditionRequiredLabel,
  getMeasurementMetricKey,
} from '~sq-server-commons/utils/overview-utils';
import { LeakPeriodInfo } from './LeakPeriodInfo';
import QualityGatePanel from './QualityGatePanel';

interface Props {
  appLeak?: ApplicationPeriod;
  branch?: Branch;
  component: Component;
  loading?: boolean;
  measures: MeasureEnhanced[];
  period?: Period;
  qgStatuses?: QualityGateStatus[];
  qualityGate?: QualityGate;
}

export default function NewCodeMeasuresPanel(props: Readonly<Props>) {
  const { appLeak, branch, component, measures, qgStatuses, period, loading, qualityGate } = props;
  const intl = useIntl();
  const isApp = isApplication(component.qualifier);

  const conditions = qgStatuses?.flatMap((qg) => qg.conditions) ?? [];

  const totalFailedCondition = qgStatuses?.flatMap((qg) => qg.failedConditions) ?? [];
  const totalNewFailedCondition = totalFailedCondition.filter((c) => isDiffMetric(c.metric));
  const newIssues = getLeakValue(findMeasure(measures, MetricKey.new_violations));
  const newIssuesCondition = conditions.find((c) => c.metric === MetricKey.new_violations);
  const issuesConditionFailed = newIssuesCondition?.level === QGStatusEnum.ERROR;
  const newAcceptedIssues = getLeakValue(findMeasure(measures, MetricKey.new_accepted_issues));
  const dependencyRisks = getLeakValue(findMeasure(measures, MetricKey.new_sca_count_any_issue));
  const newSecurityHotspots = getLeakValue(
    findMeasure(measures, MetricKey.new_security_hotspots),
  ) as string;
  const newSecurityReviewRating = getLeakValue(
    findMeasure(measures, MetricKey.new_security_review_rating),
  );

  let issuesFooter;
  if (newIssuesCondition && !isApp) {
    issuesFooter = issuesConditionFailed ? (
      <TextError
        className="sw-font-regular sw-typo-sm sw-inline"
        text={getConditionRequiredLabel(newIssuesCondition, intl, true)}
      />
    ) : (
      <LightLabel className="sw-typo-sm">
        {getConditionRequiredLabel(newIssuesCondition, intl)}
      </LightLabel>
    );
  }

  let acceptedIssuesFooter = null;
  if (isEmpty(newAcceptedIssues)) {
    acceptedIssuesFooter = (
      <StyledInfoMessage className="sw-rounded-2 sw-p-4">
        <Text size={TextSize.Small}>
          <FormattedMessage id={`overview.run_analysis_to_compute.${component.qualifier}`} />
        </Text>
      </StyledInfoMessage>
    );
  } else {
    acceptedIssuesFooter = (
      <Text isSubdued size={TextSize.Small}>
        {intl.formatMessage({ id: 'overview.accepted_issues.help' })}
      </Text>
    );
  }

  const leakPeriod = isApp ? appLeak : period;

  const nonCaycProjectsInApp =
    isApp && qgStatuses
      ? qgStatuses
          .filter(({ caycStatus }) => caycStatus === CaycStatus.NonCompliant)
          .sort(({ name: a }, { name: b }) =>
            a.localeCompare(b, undefined, { sensitivity: 'base' }),
          )
      : [];

  const showCaycWarningInProject =
    qgStatuses &&
    qgStatuses.length === 1 &&
    qgStatuses[0].caycStatus === CaycStatus.NonCompliant &&
    qualityGate?.actions?.manageConditions &&
    !isApp;

  const showCaycWarningInApp = nonCaycProjectsInApp.length > 0;

  const noConditionsAndWarningForNewCode =
    totalNewFailedCondition.length === 0 && !showCaycWarningInApp && !showCaycWarningInProject;

  return (
    <div id={getTabPanelId(CodeScope.New)}>
      {leakPeriod && (
        <div className="sw-flex sw-items-center sw-mr-6" data-spotlight-id="cayc-promotion-2">
          <Text className="sw-mr-1" isSubdued size={TextSize.Small}>
            <FormattedMessage id="overview.new_code" />
          </Text>
          <Text className="sw-flex" isHighlighted size={TextSize.Small}>
            <LeakPeriodInfo leakPeriod={leakPeriod} />
          </Text>
        </div>
      )}
      <GridContainer className="sw-relative sw-overflow-hidden sw-mt-8 js-summary">
        {!noConditionsAndWarningForNewCode && (
          <StyledConditionsCard className="sw-row-span-4 sw-col-span-4">
            <QualityGatePanel
              component={component}
              isNewCode
              loading={loading}
              qgStatuses={qgStatuses}
              qualityGate={qualityGate}
              showCaycWarningInApp={showCaycWarningInApp}
              showCaycWarningInProject={showCaycWarningInProject ?? false}
              totalFailedConditionLength={totalNewFailedCondition.length}
            />
          </StyledConditionsCard>
        )}
        <StyleMeasuresCard className="sw-col-span-4">
          <IssueMeasuresCardInner
            data-testid="overview__measures-new_issues"
            disabled={component.needIssueSync}
            failed={issuesConditionFailed}
            footer={issuesFooter}
            header={intl.formatMessage({
              id: 'overview.new_issues',
            })}
            icon={issuesConditionFailed && <TrendUpCircleIcon />}
            metric={MetricKey.new_violations}
            url={getComponentIssuesUrl(component.key, {
              ...getBranchLikeQuery(branch),
              ...DEFAULT_ISSUES_QUERY,
              inNewCodePeriod: 'true',
            })}
            value={formatMeasure(newIssues, MetricType.ShortInteger)}
          />
        </StyleMeasuresCard>
        <StyleMeasuresCard className="sw-col-span-4">
          <IssueMeasuresCardInner
            data-testid="overview__measures-accepted_issues"
            disabled={Boolean(component.needIssueSync) || isEmpty(newAcceptedIssues)}
            footer={acceptedIssuesFooter}
            header={intl.formatMessage({
              id: 'overview.accepted_issues',
            })}
            icon={
              <SnoozeCircleIcon
                color={
                  newAcceptedIssues === '0' ? 'overviewCardDefaultIcon' : 'overviewCardWarningIcon'
                }
              />
            }
            metric={MetricKey.new_accepted_issues}
            url={getComponentIssuesUrl(component.key, {
              ...getBranchLikeQuery(branch),
              issueStatuses: IssueStatus.Accepted,
              inNewCodePeriod: 'true',
            })}
            value={formatMeasure(newAcceptedIssues, MetricType.ShortInteger)}
          />
        </StyleMeasuresCard>
        <StyleMeasuresCard className="sw-col-span-4">
          <MeasuresCardPercent
            branchLike={branch}
            componentKey={component.key}
            conditionMetric={MetricKey.new_coverage}
            conditions={conditions}
            label="overview.quality_gate.coverage"
            linesMetric={MetricKey.new_lines_to_cover}
            measurementType={MeasurementType.Coverage}
            measures={measures}
            showRequired={!isApp}
            url={getComponentDrilldownUrl({
              componentKey: component.key,
              metric: getMeasurementMetricKey(MeasurementType.Coverage, true),
              branchLike: branch,
              listView: true,
            })}
            useDiffMetric
          />
        </StyleMeasuresCard>
        <StyleMeasuresCard className="sw-col-span-4">
          <MeasuresCardPercent
            branchLike={branch}
            componentKey={component.key}
            conditionMetric={MetricKey.new_duplicated_lines_density}
            conditions={conditions}
            label="overview.quality_gate.duplications"
            linesMetric={MetricKey.new_lines}
            measurementType={MeasurementType.Duplication}
            measures={measures}
            showRequired={!isApp}
            url={getComponentDrilldownUrl({
              componentKey: component.key,
              metric: getMeasurementMetricKey(MeasurementType.Duplication, true),
              branchLike: branch,
              listView: true,
            })}
            useDiffMetric
          />
        </StyleMeasuresCard>
        <StyleMeasuresCardRightBorder className="sw-col-span-4">
          <MeasuresCardNumber
            conditionMetric={MetricKey.new_security_hotspots_reviewed}
            conditions={conditions}
            icon={
              newSecurityReviewRating ? (
                <RatingComponent
                  branchLike={branch}
                  componentKey={component.key}
                  ratingMetric={MetricKey.new_security_review_rating}
                  size={RatingBadgeSize.Medium}
                />
              ) : (
                <NoDataIcon size="md" />
              )
            }
            label={
              newSecurityHotspots === '1'
                ? 'issue.type.SECURITY_HOTSPOT'
                : 'issue.type.SECURITY_HOTSPOT.plural'
            }
            metric={MetricKey.new_security_hotspots}
            showRequired={!isApp}
            url={getComponentSecurityHotspotsUrl(component.key, branch, {
              inNewCodePeriod: 'true',
            })}
            value={newSecurityHotspots}
          />
        </StyleMeasuresCardRightBorder>
        <MeasuresCardDependencyRisk
          branchLike={branch}
          className="sw-col-span-4"
          component={component}
          conditions={conditions}
          dependencyRisks={dependencyRisks}
          metricKey={MetricKey.new_sca_count_any_issue}
        />
      </GridContainer>
    </div>
  );
}

const StyledInfoMessage = styled.div`
  background-color: ${themeColor('projectCardInfo')};
`;
