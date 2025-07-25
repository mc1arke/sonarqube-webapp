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

import classNames from 'classnames';
import { orderBy, sortBy, without } from 'lodash';
import * as React from 'react';
import MultipleSelectionHint from '~shared/components/MultipleSelectionHint';
import { MetricType } from '~shared/types/metrics';
import { FacetBox, FacetItem } from '../../design-system';
import { translate } from '../../helpers/l10n';
import { formatMeasure } from '../../sonar-aligned/helpers/measures';
import { FacetKey } from '../../utils/coding-rules-query';
import Tooltip from '../controls/Tooltip';
import { FacetItemsList } from './FacetItemsList';

export interface BasicProps {
  fetching?: boolean;
  help?: React.ReactNode;
  onChange: (changes: Record<string, string | string[] | undefined>) => void;
  onToggle: (facet: FacetKey) => void;
  open: boolean;
  secondLine?: string;
  stats?: Record<string, number>;
  values: string[];
}

interface Props extends BasicProps {
  disabled?: boolean;
  disabledHelper?: string;
  headerName?: string;
  options?: string[];
  property: FacetKey;
  renderFooter?: () => React.ReactNode;
  renderName?: (value: string, disabled: boolean) => React.ReactNode;
  renderTextName?: (value: string) => string;
  singleSelection?: boolean;
}

export default class Facet extends React.PureComponent<Props> {
  handleItemClick = (itemValue: string, multiple: boolean) => {
    const { values } = this.props;
    let newValue;
    if (this.props.singleSelection) {
      const value = values.length ? values[0] : undefined;
      newValue = itemValue === value ? undefined : itemValue;
    } else if (multiple) {
      newValue = orderBy(
        values.includes(itemValue) ? without(values, itemValue) : [...values, itemValue],
      );
    } else {
      newValue = values.includes(itemValue) && values.length < 2 ? [] : [itemValue];
    }
    this.props.onChange({ [this.props.property]: newValue });
  };

  handleHeaderClick = () => {
    this.props.onToggle(this.props.property);
  };

  handleClear = () => {
    this.props.onChange({ [this.props.property]: [] });
  };

  getStat = (value: string) => this.props.stats?.[value];

  renderItem = (value: string) => {
    const active = this.props.values.includes(value);
    const stat = this.getStat(value);
    const disabled = stat === 0 || typeof stat === 'undefined';
    const { renderName = defaultRenderName, renderTextName = defaultRenderName } = this.props;

    return (
      <FacetItem
        active={active}
        className="it__search-navigator-facet"
        key={value}
        name={renderName(value, disabled)}
        onClick={this.handleItemClick}
        stat={stat && formatMeasure(stat, MetricType.ShortInteger)}
        tooltip={renderTextName(value)}
        value={value}
      />
    );
  };

  render() {
    const {
      disabled,
      disabledHelper,
      open,
      property,
      renderTextName = defaultRenderName,
      secondLine,
      stats,
      help,
      values,
      fetching,
      headerName,
    } = this.props;
    const items =
      this.props.options ||
      (stats &&
        sortBy(
          Object.keys(stats),
          (key) => -stats[key],
          (key) => renderTextName(key).toLowerCase(),
        ));
    const headerId = `facet_${property}`;
    const nbSelectableItems =
      items?.filter((item) => (stats ? stats[item] : undefined)).length ?? 0;
    const nbSelectedItems = values.length;

    return (
      <FacetBox
        className={classNames('it__search-navigator-facet-box it__search-navigator-facet-header', {
          'it__search-navigator-facet-box-forbidden': disabled,
        })}
        count={values.length}
        data-property={property}
        disabled={disabled}
        disabledHelper={disabledHelper}
        help={help}
        id={headerId}
        loading={fetching}
        name={headerName ?? translate('coding_rules.facet', property)}
        onClear={this.handleClear}
        onClick={disabled ? undefined : this.handleHeaderClick}
        open={open && !disabled}
        secondLine={secondLine}
        tooltipComponent={Tooltip}
      >
        {open && items !== undefined && (
          <FacetItemsList labelledby={headerId}>{items.map(this.renderItem)}</FacetItemsList>
        )}

        {open && this.props.renderFooter?.()}

        <MultipleSelectionHint
          className="sw-pt-4"
          selectedItems={nbSelectedItems}
          totalItems={nbSelectableItems}
        />
      </FacetBox>
    );
  }
}

function defaultRenderName(value: string) {
  return value;
}
