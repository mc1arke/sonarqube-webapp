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

import { ComponentQualifier } from '../../types/component';
import {
  isApplication,
  isFile,
  isJupyterNotebookFile,
  isPortfolioLike,
  isProject,
  isView,
} from '../component';

it.each([[isPortfolioLike]])(
  '%p should work properly',
  (utilityMethod: (componentQualifier: ComponentQualifier) => void) => {
    const results = Object.values(ComponentQualifier).reduce(
      (prev, qualifier) => ({ ...prev, [qualifier]: utilityMethod(qualifier) }),
      {},
    );
    expect(results).toMatchSnapshot();
  },
);

it.each([[isFile], [isView], [isProject], [isApplication]])(
  '%p should work properly',
  (utilityMethod: (componentQualifier: ComponentQualifier) => void) => {
    const results = Object.values(ComponentQualifier).reduce(
      (prev, qualifier) => ({ ...prev, [qualifier]: utilityMethod(qualifier) }),
      {},
    );
    expect(results).toMatchSnapshot();
  },
);

describe('isFileType', () => {
  it('should correctly handle different file types', () => {
    expect(isFile(ComponentQualifier.File)).toBe(true);
    expect(isFile(ComponentQualifier.TestFile)).toBe(true);
    expect(isFile(ComponentQualifier.Project)).toBe(false);
  });
});

it.each([
  ['foo.ipynb', true],
  ['foo.py', false],
  ['foo.ipynb.py', false],
])('%s is a Jupyter notebook file: %p', (componentKey, expected) => {
  expect(isJupyterNotebookFile(componentKey)).toBe(expected);
});
