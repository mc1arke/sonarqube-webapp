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

import { withTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { BadgeCounter } from '@sonarsource/echoes-react';
import { QualifierIcon, SubnavigationAccordion, themeColor } from '~design-system';
import ListFooter from '~shared/components/controls/ListFooter';
import { ComponentQualifier } from '~shared/types/component';
import { StandardsInformation, StandardsInformationKey } from '~shared/types/security';
import Tooltip from '~sq-server-commons/components/controls/Tooltip';
import { fileFromPath } from '~sq-server-commons/helpers/path';
import { RawHotspot } from '~sq-server-commons/types/security-hotspots';
import { SECURITY_STANDARD_RENDERER } from '../utils';
import HotspotListItem from './HotspotListItem';

export interface HotspotSimpleListProps {
  filterByCWE?: string;
  filterByCategory?: {
    category: string;
    standard: StandardsInformationKey;
  };
  filterByFile?: string;
  hotspots: RawHotspot[];
  hotspotsTotal: number;
  loadingMore: boolean;
  onHotspotClick: (hotspot: RawHotspot) => void;
  onLoadMore: () => void;
  onLocationClick: (index?: number) => void;
  selectedHotspot: RawHotspot;
  selectedHotspotLocation?: number;
  standards: StandardsInformation;
}

export default function HotspotSimpleList(props: HotspotSimpleListProps) {
  const {
    filterByCategory,
    filterByCWE,
    filterByFile,
    hotspots,
    hotspotsTotal,
    loadingMore,
    selectedHotspot,
    standards,
    onLocationClick,
    selectedHotspotLocation,
  } = props;

  const categoryLabel =
    filterByCategory &&
    SECURITY_STANDARD_RENDERER[filterByCategory.standard](standards, filterByCategory.category);

  const cweLabel =
    filterByCWE && SECURITY_STANDARD_RENDERER[StandardsInformationKey.CWE](standards, filterByCWE);

  return (
    <StyledContainer>
      <div className="sw-mt-8 sw-mb-4">
        <SubnavigationAccordion
          expanded
          header={
            <SubNavigationContainer className="sw-flex sw-justify-between">
              <div className="sw-flex sw-items-center">
                {filterByFile ? (
                  <Tooltip content={filterByFile}>
                    <span>
                      <QualifierIcon className="sw-mr-1" qualifier={ComponentQualifier.File} />
                      {fileFromPath(filterByFile)}
                    </span>
                  </Tooltip>
                ) : (
                  <>
                    {categoryLabel}
                    {categoryLabel && cweLabel && <hr />}
                    {cweLabel}
                  </>
                )}
              </div>
              <BadgeCounter value={hotspots.length} />
            </SubNavigationContainer>
          }
          id="hotspot-category"
        >
          {hotspots.map((hotspot) => (
            <HotspotListItem
              hotspot={hotspot}
              key={hotspot.key}
              onClick={props.onHotspotClick}
              onLocationClick={onLocationClick}
              selected={hotspot.key === selectedHotspot.key}
              selectedHotspotLocation={selectedHotspotLocation}
            />
          ))}
        </SubnavigationAccordion>
      </div>
      <ListFooter
        count={hotspots.length}
        loadMore={!loadingMore ? props.onLoadMore : undefined}
        loading={loadingMore}
        total={hotspotsTotal}
      />
    </StyledContainer>
  );
}

const SubNavigationContainer = styled.div`
  width: calc(100% - 1.5rem);
`;

const StyledContainer = withTheme(styled.div`
  background-color: ${themeColor('subnavigation')};
`);
