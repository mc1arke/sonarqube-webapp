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

import { throwGlobalError } from '~adapters/helpers/error';
import { getJSON } from '~adapters/helpers/request';
import { addGlobalSuccessMessage } from '../design-system';
import { translate, translateWithParameters } from './l10n';
import {
  get,
  getText,
  omitNil,
  parseError,
  post,
  postJSON,
  postJSONBody,
  request,
} from './request';

const exposeLibraries = () => {
  const global = window as any;

  global.SonarRequest = {
    request,
    get,
    getJSON,
    getText,
    omitNil,
    parseError,
    post,
    postJSON,
    postJSONBody,
    throwGlobalError,
    addGlobalSuccessMessage,
  };

  global.t = translate;
  global.tp = translateWithParameters;
};

export default exposeLibraries;
