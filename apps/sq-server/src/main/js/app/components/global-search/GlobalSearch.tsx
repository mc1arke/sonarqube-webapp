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
  ButtonVariety,
  GlobalNavigation,
  IconSearch,
  SearchInput,
  Text,
} from '@sonarsource/echoes-react';
import { debounce, isEmpty, uniqBy } from 'lodash';
import * as React from 'react';
import { FormattedMessage } from 'react-intl';
import { DEBOUNCE_DELAY, DropdownMenu, Popup, PopupZLevel } from '~design-system';
import { withRouter } from '~shared/components/hoc/withRouter';
import { ComponentQualifier } from '~shared/types/component';
import { Router } from '~shared/types/router';
import { getSuggestions } from '~sq-server-commons/api/components';
import FocusOutHandler from '~sq-server-commons/components/controls/FocusOutHandler';
import OutsideClickHandler from '~sq-server-commons/components/controls/OutsideClickHandler';
import { PopupPlacement } from '~sq-server-commons/components/ui/popups';
import { isInput, isShortcut } from '~sq-server-commons/helpers/keyboardEventHelpers';
import { KeyboardKeys } from '~sq-server-commons/helpers/keycodes';
import { getIntl } from '~sq-server-commons/helpers/l10nBundle';
import { getKeyboardShortcutEnabled } from '~sq-server-commons/helpers/preferences';
import { getComponentOverviewUrl } from '~sq-server-commons/helpers/urls';
import RecentHistory from '../RecentHistory';
import { GlobalSearchResult } from './GlobalSearchResult';
import GlobalSearchResults from './GlobalSearchResults';
import { ComponentResult, More, Results, sortQualifiers } from './utils';

interface Props {
  router: Router;
}
interface State {
  loading: boolean;
  loadingMore?: string;
  more: More;
  open: boolean;
  query: string;
  results: Results;
  selected?: string;
}
const MIN_SEARCH_QUERY_LENGTH = 2;

export class GlobalSearch extends React.PureComponent<Props, State> {
  input?: HTMLInputElement | null;
  node?: HTMLElement | null;
  nodes: Record<string, HTMLElement | undefined>;
  mounted = false;

  constructor(props: Props) {
    super(props);
    this.nodes = {};
    this.search = debounce(this.search, DEBOUNCE_DELAY);

    this.state = {
      loading: false,
      more: {},
      open: false,
      query: '',
      results: {},
    };
  }

  componentDidMount() {
    this.mounted = true;
    document.addEventListener('keydown', this.handleSKeyDown);
  }

  componentDidUpdate(_prevProps: Props, prevState: State) {
    if (prevState.selected !== this.state.selected) {
      this.scrollToSelected();
    }
  }

  componentWillUnmount() {
    this.mounted = false;
    document.removeEventListener('keydown', this.handleSKeyDown);
  }

  focusInput = () => {
    if (this.input) {
      this.input.focus();
    }
  };

  handleClickOutside = () => {
    this.closeSearch(false);
  };

  handleFocus = () => {
    if (!this.state.open) {
      // simulate click to close any other dropdowns
      document.documentElement.click();
    }

    this.openSearch();
  };

  openSearch = () => {
    if (!this.state.open && !this.state.query) {
      this.search('');
    }

    this.setState({ open: true });
  };

  closeSearch = (clear = true) => {
    if (this.input) {
      this.input.blur();
    }

    if (clear) {
      this.setState({
        more: {},
        open: false,
        query: '',
        results: {},
        selected: undefined,
      });
    } else {
      this.setState({ open: false });
    }
  };

  getPlainComponentsList = (results: Results, more: More) =>
    sortQualifiers(Object.keys(results)).reduce((components, qualifier) => {
      const next = [...components, ...(results[qualifier] ?? []).map((component) => component.key)];
      if (more[qualifier]) {
        next.push('qualifier###' + qualifier);
      }

      return next;
    }, []);

  stopLoading = () => {
    if (this.mounted) {
      this.setState({ loading: false });
    }
  };

  search = (query: string) => {
    if (query.length === 0 || query.length >= MIN_SEARCH_QUERY_LENGTH) {
      this.setState({ loading: true });
      const recentlyBrowsed = RecentHistory.get().map((component) => component.key);

      getSuggestions(query, recentlyBrowsed).then((response) => {
        // compare `this.state.query` and `query` to handle two request done almost at the same time
        // in this case only the request that matches the current query should be taken
        if (this.mounted && this.state.query === query) {
          const results: Results = {};
          const more: More = {};
          this.nodes = {};
          response.results.forEach((group) => {
            results[group.q] = group.items.map((item) => ({ ...item, qualifier: group.q }));
            more[group.q] = group.more;
          });
          const list = this.getPlainComponentsList(results, more);
          this.setState({
            loading: false,
            more,
            results,
            selected: list.length > 0 ? list[0] : undefined,
          });
        }
      }, this.stopLoading);
    } else {
      this.setState({ loading: false });
    }
  };

  searchMore = (qualifier: string) => {
    const { query } = this.state;

    if (query.length === 1) {
      return;
    }

    this.setState({ loading: true, loadingMore: qualifier });
    const recentlyBrowsed = RecentHistory.get().map((component) => component.key);

    getSuggestions(query, recentlyBrowsed, qualifier).then((response) => {
      if (this.mounted) {
        const group = response.results.find((group) => group.q === qualifier);
        const moreResults = (group ? group.items : []).map((item) => ({ ...item, qualifier }));

        this.setState((state) => ({
          loading: false,
          loadingMore: undefined,
          more: { ...state.more, [qualifier]: 0 },
          results: {
            ...state.results,
            [qualifier]: uniqBy([...(state.results[qualifier] ?? []), ...moreResults], 'key'),
          },
          selected: moreResults.length > 0 ? moreResults[0].key : state.selected,
        }));

        this.focusInput();
      }
    }, this.stopLoading);
  };

  handleQueryChange = (query: string) => {
    this.setState({ query });
    this.search(query);
  };

  selectPrevious = () => {
    this.setState(({ more, results, selected }) => {
      if (selected) {
        const list = this.getPlainComponentsList(results, more);
        const index = list.indexOf(selected);
        return index > 0 ? { selected: list[index - 1] } : null;
      }

      return null;
    });
  };

  selectNext = () => {
    this.setState(({ more, results, selected }) => {
      if (selected) {
        const list = this.getPlainComponentsList(results, more);
        const index = list.indexOf(selected);
        return index >= 0 && index < list.length - 1 ? { selected: list[index + 1] } : null;
      }

      return null;
    });
  };

  openSelected = () => {
    const { results, selected } = this.state;

    if (!selected) {
      return;
    }

    if (selected.startsWith('qualifier###')) {
      this.searchMore(selected.substring('qualifier###'.length));
    } else {
      let qualifier = ComponentQualifier.Project;

      if ((results[ComponentQualifier.Portfolio] ?? []).find((r) => r.key === selected)) {
        qualifier = ComponentQualifier.Portfolio;
      } else if ((results[ComponentQualifier.SubPortfolio] ?? []).find((r) => r.key === selected)) {
        qualifier = ComponentQualifier.SubPortfolio;
      }

      this.props.router.push(getComponentOverviewUrl(selected, qualifier));

      this.closeSearch();
    }
  };

  scrollToSelected = () => {
    if (this.state.selected) {
      const node = this.nodes[this.state.selected];

      if (node && this.node) {
        node.scrollIntoView({
          block: 'center',
          behavior: 'smooth',
        });
      }
    }
  };

  handleSKeyDown = (event: KeyboardEvent) => {
    if (!getKeyboardShortcutEnabled() || isInput(event) || isShortcut(event)) {
      return true;
    }

    if (event.key === KeyboardKeys.KeyS) {
      event.preventDefault();
      this.focusInput();
      this.openSearch();
    }
  };

  handleKeyDown = (event: React.KeyboardEvent) => {
    if (!this.state.open) {
      return;
    }

    switch (event.key) {
      case KeyboardKeys.Enter:
        event.preventDefault();
        event.stopPropagation();
        this.openSelected();
        break;
      case KeyboardKeys.UpArrow:
        event.preventDefault();
        event.stopPropagation();
        this.selectPrevious();
        break;
      case KeyboardKeys.Escape:
        event.preventDefault();
        event.stopPropagation();
        this.closeSearch();
        break;
      case KeyboardKeys.DownArrow:
        event.preventDefault();
        event.stopPropagation();
        this.selectNext();
        break;
    }
  };

  innerRef = (component: string, node: HTMLElement | null) => {
    if (node) {
      this.nodes[component] = node;
    }
  };

  searchInputRef = (node: HTMLInputElement | null) => {
    this.input = node;
  };

  renderResult = (component: ComponentResult) => (
    <GlobalSearchResult
      component={component}
      innerRef={this.innerRef}
      key={component.key}
      onClose={this.closeSearch}
      selected={this.state.selected === component.key}
    />
  );

  renderNoResults = () => (
    <div className="sw-px-3 sw-py-2">
      <FormattedMessage id="no_results_for_x" values={{ 0: this.state.query }} />
    </div>
  );

  render() {
    const { open, query, results, more, loadingMore, selected, loading } = this.state;
    const intl = getIntl();
    const list = this.getPlainComponentsList(results, more);

    return (
      <form role="search">
        {!open && isEmpty(query) ? (
          <GlobalNavigation.Action
            Icon={IconSearch}
            ariaLabel={intl.formatMessage({ id: 'search_verb' })}
            onClick={this.handleFocus}
            variety={ButtonVariety.DefaultGhost}
          />
        ) : (
          <FocusOutHandler onFocusOut={this.handleClickOutside}>
            <OutsideClickHandler onClickOutside={this.handleClickOutside}>
              <Popup
                allowResizing
                overlay={
                  open && (
                    <DropdownMenu
                      aria-owns="global-search-input"
                      className="it__global-navbar-search-dropdown sw-overflow-y-auto sw-overflow-x-hidden"
                      innerRef={(node: HTMLUListElement | null) => (this.node = node)}
                      maxHeight="38rem"
                      size="auto"
                    >
                      <GlobalSearchResults
                        loading={loading}
                        loadingMore={loadingMore}
                        more={more}
                        onMoreClick={this.searchMore}
                        query={query}
                        renderNoResults={this.renderNoResults}
                        renderResult={this.renderResult}
                        results={results}
                        selected={selected}
                      />
                      {list.length > 0 && (
                        <li className="sw-px-3 sw-pt-1">
                          <Text isSubdued>
                            <FormattedMessage id="global_search.shortcut_hint" />
                          </Text>
                        </li>
                      )}
                    </DropdownMenu>
                  )
                }
                placement={PopupPlacement.BottomLeft}
                zLevel={PopupZLevel.Global}
              >
                <SearchInput
                  hasAutoFocus={open}
                  hasPreventScroll
                  id="global-search-input"
                  isLoading={loading}
                  minLength={MIN_SEARCH_QUERY_LENGTH}
                  onChange={this.handleQueryChange}
                  onFocus={this.handleFocus}
                  onKeyDown={this.handleKeyDown}
                  placeholderLabel={intl.formatMessage({ id: 'search.search_for_projects' })}
                  ref={this.searchInputRef}
                  value={query}
                  width="large"
                />
              </Popup>
            </OutsideClickHandler>
          </FocusOutHandler>
        )}
      </form>
    );
  }
}

export default withRouter(GlobalSearch);
