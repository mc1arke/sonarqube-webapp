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
import { groupBy, omit } from 'lodash';
import * as React from 'react';
import {
  LAYOUT_GLOBAL_NAV_HEIGHT,
  LAYOUT_PROJECT_NAV_HEIGHT,
  ToggleButton,
  getTabId,
  getTabPanelId,
  themeColor,
  themeShadow,
} from '~design-system';
import { RuleDescriptionSection, RuleDescriptionSections } from '~shared/types/rules';
import RuleDescription from '~sq-server-commons/components/rules/RuleDescription';
import { useComponent } from '~sq-server-commons/context/componentContext/withComponentContext';
import {
  isInput,
  isRadioButton,
  isShortcut,
} from '~sq-server-commons/helpers/keyboardEventHelpers';
import { KeyboardKeys } from '~sq-server-commons/helpers/keycodes';
import { translate } from '~sq-server-commons/helpers/l10n';
import { useRefreshBranchStatus } from '~sq-server-commons/queries/branch';
import { Hotspot, HotspotStatusOption } from '~sq-server-commons/types/security-hotspots';
import useStickyDetection from '../hooks/useStickyDetection';
import StatusReviewButton from './status/StatusReviewButton';

interface Props {
  activityTabContent: React.ReactNode;
  codeTabContent: React.ReactNode;
  hotspot: Hotspot;
  onUpdateHotspot: (statusUpdate?: boolean, statusOption?: HotspotStatusOption) => Promise<void>;
  ruleDescriptionSections?: RuleDescriptionSection[];
  ruleLanguage?: string;
}

interface Tab {
  counter?: number;
  label: string;
  value: TabKeys;
}

export enum TabKeys {
  Code = 'code',
  RiskDescription = 'risk',
  VulnerabilityDescription = 'vulnerability',
  FixRecommendation = 'fix',
  Activity = 'activity',
}

const TABS_OFFSET = LAYOUT_GLOBAL_NAV_HEIGHT + LAYOUT_PROJECT_NAV_HEIGHT;

export default function HotspotViewerTabs(props: Props) {
  const {
    activityTabContent,
    codeTabContent,
    hotspot,
    onUpdateHotspot,
    ruleDescriptionSections,
    ruleLanguage,
  } = props;

  const { component } = useComponent();
  const refreshBranchStatus = useRefreshBranchStatus(component?.key);
  const isSticky = useStickyDetection('.hotspot-tabs', {
    offset: TABS_OFFSET,
  });

  const tabs = React.useMemo(() => {
    const descriptionSectionsByKey = groupBy(ruleDescriptionSections, (section) => section.key);
    const labelSuffix = isSticky ? '.short' : '';

    return [
      {
        value: TabKeys.Code,
        label: translate(`hotspots.tabs.code${labelSuffix}`),
        show: true,
      },
      {
        value: TabKeys.RiskDescription,
        label: translate(`hotspots.tabs.risk_description${labelSuffix}`),
        show:
          descriptionSectionsByKey[RuleDescriptionSections.Default] ||
          descriptionSectionsByKey[RuleDescriptionSections.RootCause],
      },
      {
        value: TabKeys.VulnerabilityDescription,
        label: translate(`hotspots.tabs.vulnerability_description${labelSuffix}`),
        show: descriptionSectionsByKey[RuleDescriptionSections.AssessTheProblem] !== undefined,
      },
      {
        value: TabKeys.FixRecommendation,
        label: translate(`hotspots.tabs.fix_recommendations${labelSuffix}`),
        show: descriptionSectionsByKey[RuleDescriptionSections.HowToFix] !== undefined,
      },
      {
        value: TabKeys.Activity,
        label: translate(`hotspots.tabs.activity${labelSuffix}`),
        show: true,
        counter: hotspot.comment.length,
      },
    ]
      .filter((tab) => tab.show)
      .map((tab) => omit(tab, 'show'));
  }, [isSticky, ruleDescriptionSections, hotspot.comment]);

  const [currentTab, setCurrentTab] = React.useState<Tab>(tabs[0]);

  const selectNeighboringTab = React.useCallback(
    (shift: number) => {
      setCurrentTab((currentTab) => {
        const index = currentTab && tabs.findIndex((tab) => tab.value === currentTab.value);

        if (index !== undefined && index > -1) {
          const newIndex = Math.max(0, Math.min(tabs.length - 1, index + shift));
          return tabs[newIndex];
        }

        return currentTab;
      });
    },
    [tabs],
  );

  const handleKeyboardNavigation = React.useCallback(
    (event: KeyboardEvent) => {
      if (isInput(event) || isShortcut(event) || isRadioButton(event)) {
        return true;
      }

      if (event.key === KeyboardKeys.LeftArrow) {
        event.preventDefault();
        selectNeighboringTab(-1);
      } else if (event.key === KeyboardKeys.RightArrow) {
        event.preventDefault();
        selectNeighboringTab(+1);
      }
    },
    [selectNeighboringTab],
  );

  const handleSelectTabs = React.useCallback(
    (tabKey: TabKeys) => {
      const currentTab = tabs.find((tab) => tab.value === tabKey);

      if (currentTab) {
        setCurrentTab(currentTab);
      }
    },
    [tabs],
  );

  const handleStatusChange = React.useCallback(
    async (statusOption: HotspotStatusOption) => {
      await onUpdateHotspot(true, statusOption);
      refreshBranchStatus();
    },
    [onUpdateHotspot, refreshBranchStatus],
  );

  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyboardNavigation);

    return () => {
      document.removeEventListener('keydown', handleKeyboardNavigation);
    };
  }, [handleKeyboardNavigation]);

  React.useEffect(() => {
    setCurrentTab(tabs[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotspot.key]);

  React.useEffect(() => {
    if (currentTab.value !== TabKeys.Code) {
      window.scrollTo({ top: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTab]);

  const descriptionSectionsByKey = groupBy(ruleDescriptionSections, (section) => section.key);

  const rootCauseDescriptionSections =
    descriptionSectionsByKey[RuleDescriptionSections.Default] ||
    descriptionSectionsByKey[RuleDescriptionSections.RootCause];

  return (
    <>
      <StickyTabs
        className="sw-sticky sw-py-4 sw--mx-6 sw-px-6 sw-z-filterbar-header hotspot-tabs"
        isSticky={isSticky}
        top={TABS_OFFSET}
      >
        <div className="sw-flex sw-justify-between">
          <ToggleButton
            onChange={handleSelectTabs}
            options={tabs}
            role="tablist"
            value={currentTab.value}
          />
          {isSticky && <StatusReviewButton hotspot={hotspot} onStatusChange={handleStatusChange} />}
        </div>
      </StickyTabs>
      <div
        aria-labelledby={getTabId(currentTab.value)}
        className="sw-mt-2"
        id={getTabPanelId(currentTab.value)}
        role="tabpanel"
      >
        {currentTab.value === TabKeys.Code && codeTabContent}

        {currentTab.value === TabKeys.RiskDescription && rootCauseDescriptionSections && (
          <RuleDescription language={ruleLanguage} sections={rootCauseDescriptionSections} />
        )}

        {currentTab.value === TabKeys.VulnerabilityDescription &&
          descriptionSectionsByKey[RuleDescriptionSections.AssessTheProblem] && (
            <RuleDescription
              language={ruleLanguage}
              sections={descriptionSectionsByKey[RuleDescriptionSections.AssessTheProblem]}
            />
          )}

        {currentTab.value === TabKeys.FixRecommendation &&
          descriptionSectionsByKey[RuleDescriptionSections.HowToFix] && (
            <RuleDescription
              language={ruleLanguage}
              sections={descriptionSectionsByKey[RuleDescriptionSections.HowToFix]}
            />
          )}

        {currentTab.value === TabKeys.Activity && activityTabContent}
      </div>
    </>
  );
}

const StickyTabs = styled.div<{ isSticky: boolean; top: number }>`
  background-color: ${themeColor('pageBlock')};
  box-shadow: ${({ isSticky }) => (isSticky ? themeShadow('sm') : 'none')};
  top: ${({ top }) => top}px;
`;
