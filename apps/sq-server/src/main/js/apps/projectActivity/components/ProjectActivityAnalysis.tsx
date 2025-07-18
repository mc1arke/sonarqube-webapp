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
import {
  ButtonIcon,
  ButtonSize,
  ButtonVariety,
  DropdownMenu,
  IconMoreVertical,
} from '@sonarsource/echoes-react';
import classNames from 'classnames';
import * as React from 'react';
import { WrappedComponentProps, injectIntl } from 'react-intl';
import { HelperHintIcon, themeBorder, themeColor } from '~design-system';
import { defaultFormatterOptions } from '~shared/components/intl/DateTimeFormatter';
import TimeFormatter from '~shared/components/intl/TimeFormatter';
import ClickEventBoundary from '~sq-server-commons/components/controls/ClickEventBoundary';
import Tooltip from '~sq-server-commons/components/controls/Tooltip';
import { parseDate } from '~sq-server-commons/helpers/dates';
import { translate, translateWithParameters } from '~sq-server-commons/helpers/l10n';
import {
  ParsedAnalysis,
  ProjectAnalysisEventCategory,
} from '~sq-server-commons/types/project-activity';
import Events from './Events';
import AddEventForm from './forms/AddEventForm';
import RemoveAnalysisForm from './forms/RemoveAnalysisForm';

export interface ProjectActivityAnalysisProps extends WrappedComponentProps {
  analysis: ParsedAnalysis;
  canAdmin?: boolean;
  canCreateVersion: boolean;
  canDeleteAnalyses?: boolean;
  isBaseline: boolean;
  isFirst: boolean;
  onUpdateSelectedDate: (date: Date) => void;
  selected: boolean;
}

export enum Dialog {
  AddEvent = 'add_event',
  AddVersion = 'add_version',
  RemoveAnalysis = 'remove_analysis',
}

function ProjectActivityAnalysis(props: ProjectActivityAnalysisProps) {
  let node: HTMLLIElement | null = null;

  const {
    analysis,
    isBaseline,
    isFirst,
    canAdmin,
    canCreateVersion,
    selected,
    intl: { formatDate },
  } = props;

  React.useEffect(() => {
    if (node && selected) {
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  const [dialog, setDialog] = React.useState<Dialog | undefined>();
  const closeDialog = () => {
    setDialog(undefined);
  };

  const parsedDate = parseDate(analysis.date);
  const hasVersion = analysis.events.find((event) => event.category === 'VERSION') != null;

  const canAddVersion = canAdmin && !hasVersion && canCreateVersion;
  const canAddEvent = canAdmin;
  const canDeleteAnalyses =
    props.canDeleteAnalyses && !isFirst && !analysis.manualNewCodePeriodBaseline;

  let tooltipContent = <TimeFormatter date={parsedDate} long />;
  if (analysis.buildString) {
    tooltipContent = (
      <>
        {tooltipContent}{' '}
        {translateWithParameters('project_activity.analysis_build_string_X', analysis.buildString)}
      </>
    );
  }

  return (
    <>
      <Tooltip content={tooltipContent} mouseEnterDelay={0.5} side="left">
        <ActivityAnalysisListItem
          aria-label={translateWithParameters(
            'project_activity.show_analysis_X_on_graph',
            analysis.buildString ?? formatDate(parsedDate, defaultFormatterOptions),
          )}
          className={classNames(
            'it__project-activity-analysis sw-flex sw-cursor-pointer sw-p-1 sw-relative',
            {
              active: selected,
            },
          )}
          onClick={() => {
            if (!selected) {
              props.onUpdateSelectedDate(analysis.date);
            }
          }}
          ref={(ref) => (node = ref)}
        >
          <div className="it__project-activity-time">
            <ActivityTime className="sw-h-page sw-typo-semibold sw-text-right sw-mr-2 sw-py-1/2">
              <TimeFormatter date={parsedDate} long={false}>
                {(formattedTime) => (
                  <time dateTime={parsedDate.toISOString()}>{formattedTime}</time>
                )}
              </TimeFormatter>
            </ActivityTime>
          </div>

          {(canAddVersion || canAddEvent || canDeleteAnalyses) && (
            <ClickEventBoundary>
              <div className="sw-h-page sw-grow-0 sw-shrink-0 sw-mr-4 sw-relative">
                <DropdownMenu
                  id="it__analysis-actions"
                  items={
                    <>
                      {canAddVersion && (
                        <DropdownMenu.ItemButton
                          className="js-add-version"
                          onClick={() => {
                            setDialog(Dialog.AddVersion);
                          }}
                        >
                          {translate('project_activity.add_version')}
                        </DropdownMenu.ItemButton>
                      )}
                      {canAddEvent && (
                        <DropdownMenu.ItemButton
                          className="js-add-event"
                          onClick={() => {
                            setDialog(Dialog.AddEvent);
                          }}
                        >
                          {translate('project_activity.add_custom_event')}
                        </DropdownMenu.ItemButton>
                      )}
                      {(canAddVersion || canAddEvent) && canDeleteAnalyses && (
                        <DropdownMenu.Separator />
                      )}
                      {canDeleteAnalyses && (
                        <DropdownMenu.ItemButtonDestructive
                          className="js-delete-analysis"
                          onClick={() => {
                            setDialog(Dialog.RemoveAnalysis);
                          }}
                        >
                          {translate('project_activity.delete_analysis')}
                        </DropdownMenu.ItemButtonDestructive>
                      )}
                    </>
                  }
                >
                  <ButtonIcon
                    Icon={IconMoreVertical}
                    ariaLabel={translateWithParameters(
                      'project_activity.analysis_X_actions',
                      analysis.buildString ?? formatDate(parsedDate, defaultFormatterOptions),
                    )}
                    className="-sw-mt-1"
                    size={ButtonSize.Medium}
                    variety={ButtonVariety.PrimaryGhost}
                  />
                </DropdownMenu>

                {[Dialog.AddEvent, Dialog.AddVersion].includes(dialog as Dialog) && (
                  <AddEventForm
                    addEventButtonText={
                      dialog === Dialog.AddVersion
                        ? 'project_activity.add_version'
                        : 'project_activity.add_custom_event'
                    }
                    analysis={analysis}
                    category={
                      dialog === Dialog.AddVersion
                        ? ProjectAnalysisEventCategory.Version
                        : undefined
                    }
                    onClose={closeDialog}
                  />
                )}

                {dialog === 'remove_analysis' && (
                  <RemoveAnalysisForm analysis={analysis} onClose={closeDialog} />
                )}
              </div>
            </ClickEventBoundary>
          )}

          {analysis.events.length > 0 && (
            <Events
              analysisKey={analysis.key}
              canAdmin={canAdmin}
              events={analysis.events}
              isFirst={isFirst}
            />
          )}
        </ActivityAnalysisListItem>
      </Tooltip>
      {isBaseline && (
        <BaselineMarker className="sw-typo-default sw-mt-2">
          <span className="sw-py-1/2 sw-px-1">
            {translate('project_activity.new_code_period_start')}
          </span>
          <Tooltip content={translate('project_activity.new_code_period_start.help')} side="top">
            <HelperHintIcon className="sw-ml-1" />
          </Tooltip>
        </BaselineMarker>
      )}
    </>
  );
}

const ActivityTime = styled.div`
  box-sizing: border-box;
  width: 4.5rem;
`;

const ActivityAnalysisListItem = styled.li`
  border-bottom: ${themeBorder('default')};
  border-left: ${themeBorder('active', 'transparent')};

  &:first-of-type {
    border-top: ${themeBorder('default')};
  }

  &:focus {
    outline: none;
  }

  &:hover,
  &:focus,
  &.active {
    background-color: ${themeColor('subnavigationHover')};
  }

  &.active {
    border-left: ${themeBorder('active')};
  }
`;

export const BaselineMarker = styled.li`
  display: flex;
  align-items: center;
  border-bottom: ${themeBorder('default', 'newCodeHighlight')};

  & span {
    background-color: ${themeColor('dropdownMenuFocus')};
  }
`;

export default injectIntl(ProjectActivityAnalysis);
