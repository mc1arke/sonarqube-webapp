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
import { LinkStandalone, Spinner } from '@sonarsource/echoes-react';
import * as React from 'react';
import { FormattedMessage } from 'react-intl';
import { CardSeparator, InfoCard, TextError } from '~design-system';
import { isApplication } from '~shared/helpers/component';
import { ComponentQualifier } from '~shared/types/component';
import IgnoredConditionWarning from '~sq-server-commons/components/overview/IgnoredConditionWarning';
import { DocLink } from '~sq-server-commons/helpers/doc-links';
import { useDocUrl } from '~sq-server-commons/helpers/docs';
import { isDiffMetric } from '~sq-server-commons/helpers/measures';
import { QualityGateStatus } from '~sq-server-commons/types/quality-gates';
import { CaycStatus, Component, QualityGate } from '~sq-server-commons/types/types';
import ApplicationNonCaycProjectWarning from './ApplicationNonCaycProjectWarning';
import CleanAsYouCodeWarning from './CleanAsYouCodeWarning';
import QualityGatePanelSection from './QualityGatePanelSection';
import SonarLintPromotion from './SonarLintPromotion';

export interface QualityGatePanelProps {
  component: Pick<Component, 'key' | 'qualifier' | 'qualityGate'>;
  isNewCode?: boolean;
  loading?: boolean;
  qgStatuses?: QualityGateStatus[];
  qualityGate?: QualityGate;
  showCaycWarningInApp?: boolean;
  showCaycWarningInProject?: boolean;
  totalFailedConditionLength: number;
}

export function QualityGatePanel(props: QualityGatePanelProps) {
  const {
    component,
    loading,
    qgStatuses = [],
    qualityGate,
    isNewCode = false,
    totalFailedConditionLength,
    showCaycWarningInProject = false,
    showCaycWarningInApp = false,
  } = props;

  const caycUrl = useDocUrl(DocLink.CaYC);

  if (qgStatuses === undefined) {
    return null;
  }

  const failedQgStatuses = qgStatuses.filter((qgStatus) => qgStatus.failedConditions.length > 0);

  const isApp = isApplication(component.qualifier);

  const nonCaycProjectsInApp = isApp
    ? qgStatuses
        .filter(({ caycStatus }) => caycStatus === CaycStatus.NonCompliant)
        .sort(({ name: a }, { name: b }) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    : [];

  const showIgnoredConditionWarning =
    component.qualifier === ComponentQualifier.Project &&
    qgStatuses.some((p) => Boolean(p.ignoredConditions));

  return (
    <Spinner isLoading={loading}>
      <Column data-testid="overview__quality-gate-panel-conditions">
        <Conditions>
          {showIgnoredConditionWarning && isNewCode && <IgnoredConditionWarning />}

          {isApp && (
            <>
              <TextError
                className="sw-mb-3"
                text={
                  <FormattedMessage
                    id="quality_gates.conditions.x_conditions_failed"
                    values={{
                      conditions: totalFailedConditionLength,
                    }}
                  />
                }
              />
              <CardSeparator />
            </>
          )}

          {totalFailedConditionLength > 0 && (
            <div data-test="overview__quality-gate-conditions">
              {failedQgStatuses.map((qgStatus, qgStatusIdx) => {
                const failedConditionLength = qgStatus.failedConditions.filter((con) =>
                  isNewCode ? isDiffMetric(con.metric) : !isDiffMetric(con.metric),
                ).length;
                if (failedConditionLength > 0) {
                  return (
                    <QualityGatePanelSection
                      isApplication={isApp}
                      isLastStatus={qgStatusIdx === failedQgStatuses.length - 1}
                      isNewCode={isNewCode}
                      key={qgStatus.key}
                      qgStatus={qgStatus}
                      qualityGate={qualityGate}
                    />
                  );
                }
                return null;
              })}
            </div>
          )}
        </Conditions>

        {showCaycWarningInApp && (
          <InfoCard
            className="sw-typo-default"
            footer={
              <LinkStandalone to={caycUrl}>
                <FormattedMessage id="overview.quality_gate.conditions.cayc.link" />
              </LinkStandalone>
            }
          >
            <ApplicationNonCaycProjectWarning projects={nonCaycProjectsInApp} />
          </InfoCard>
        )}

        {showCaycWarningInProject && (
          <InfoCard
            className="sw-typo-default"
            footer={
              <LinkStandalone to={caycUrl}>
                <FormattedMessage id="overview.quality_gate.conditions.cayc.link" />
              </LinkStandalone>
            }
          >
            <CleanAsYouCodeWarning component={component} />
          </InfoCard>
        )}
        <SonarLintPromotion qgConditions={qgStatuses?.flatMap((qg) => qg.failedConditions)} />
      </Column>
    </Spinner>
  );
}

export default React.memo(QualityGatePanel);

const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--echoes-dimension-space-400);
`;

const Conditions = styled.div`
  &:empty {
    display: contents;
  }
`;
