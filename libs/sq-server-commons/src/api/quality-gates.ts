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
import { BranchParameters } from '~shared/types/branch-like';
import { post, postJSON } from '../helpers/request';
import {
  AddDeleteGroupPermissionsParameters,
  AddDeleteUserPermissionsParameters,
  Group,
  QualityGateApplicationStatus,
  QualityGateProjectStatus,
  SearchPermissionsParameters,
} from '../types/quality-gates';
import { Condition, Paging, QualityGate, QualityGatePreview } from '../types/types';
import { UserBase } from '../types/users';

export interface SearchQualityGateProjectsData {
  gateName: string;
  page?: number;
  pageSize?: number;
  query?: string;
  selected?: string;
}

export interface SearchQualityGateProjectsResponse {
  paging: Paging;
  results: Array<{
    containsAiCode?: boolean;
    key: string;
    name: string;
    selected: boolean;
  }>;
}

export function fetchQualityGates(): Promise<{
  actions: { create: boolean };
  qualitygates: QualityGate[];
}> {
  return getJSON('/api/qualitygates/list').catch(throwGlobalError);
}

export function fetchQualityGate(data: { name: string }): Promise<QualityGate> {
  return getJSON('/api/qualitygates/show', data).catch(throwGlobalError);
}

export function createQualityGate(data: { name: string }): Promise<QualityGate> {
  return postJSON('/api/qualitygates/create', data).catch(throwGlobalError);
}

export function deleteQualityGate(data: { name: string }): Promise<void | Response> {
  return post('/api/qualitygates/destroy', data).catch(throwGlobalError);
}

export function renameQualityGate(data: {
  currentName: string;
  name: string;
}): Promise<void | Response> {
  return post('/api/qualitygates/rename', data).catch(throwGlobalError);
}

export function copyQualityGate(data: { name: string; sourceName: string }): Promise<QualityGate> {
  return postJSON('/api/qualitygates/copy', data).catch(throwGlobalError);
}

export function setQualityGateAsDefault(data: { name: string }): Promise<void | Response> {
  return post('/api/qualitygates/set_as_default', data).catch(throwGlobalError);
}

export function setQualityGateAiQualified(
  gateName: string,
  aiCodeAssurance: boolean,
): Promise<void> {
  return post('/api/qualitygates/set_ai_code_assurance', {
    aiCodeAssurance,
    gateName,
  }).catch(throwGlobalError);
}

export function createCondition(
  data: {
    gateName: string;
  } & Omit<Condition, 'id'>,
): Promise<Condition> {
  return postJSON('/api/qualitygates/create_condition', data).catch(throwGlobalError);
}

export function updateCondition(data: Condition): Promise<Condition> {
  return postJSON('/api/qualitygates/update_condition', data).catch(throwGlobalError);
}

export function deleteCondition(data: { id: string }): Promise<void> {
  return post('/api/qualitygates/delete_condition', data);
}

export function getGateForProject(data: { project: string }): Promise<QualityGatePreview> {
  return getJSON('/api/qualitygates/get_by_project', data).then(
    ({ qualityGate }) => ({
      ...qualityGate,
      isDefault: qualityGate.default,
    }),
    throwGlobalError,
  );
}

export function searchProjects(
  data: SearchQualityGateProjectsData,
): Promise<SearchQualityGateProjectsResponse> {
  return getJSON('/api/qualitygates/search', data).catch(throwGlobalError);
}

export function getAllQualityGateProjects(
  data: SearchQualityGateProjectsData,
  prev?: SearchQualityGateProjectsResponse,
): Promise<SearchQualityGateProjectsResponse> {
  return searchProjects({ ...data, pageSize: 1000 }).then((r) => {
    const result = prev
      ? {
          results: [...prev.results, ...r.results],
          paging: r.paging,
        }
      : r;

    if (result.paging.pageIndex * result.paging.pageSize >= result.paging.total) {
      return result;
    }
    return getAllQualityGateProjects({ ...data, page: result.paging.pageIndex + 1 }, result);
  });
}

export function associateGateWithProject(data: {
  gateName: string;
  projectKey: string;
}): Promise<void | Response> {
  return post('/api/qualitygates/select', data).catch(throwGlobalError);
}

export function dissociateGateWithProject(data: { projectKey: string }): Promise<void | Response> {
  return post('/api/qualitygates/deselect', data).catch(throwGlobalError);
}

export function getApplicationQualityGate(data: {
  application: string;
  branch?: string;
}): Promise<QualityGateApplicationStatus> {
  return getJSON('/api/qualitygates/application_status', data).catch(throwGlobalError);
}

export function getQualityGateProjectStatus(
  data: {
    projectId?: string;
    projectKey?: string;
  } & BranchParameters,
): Promise<QualityGateProjectStatus> {
  return getJSON('/api/qualitygates/project_status', data)
    .then((r) => r.projectStatus)
    .catch(throwGlobalError);
}

export function addUser(data: AddDeleteUserPermissionsParameters) {
  return post('/api/qualitygates/add_user', data).catch(throwGlobalError);
}

export function removeUser(data: AddDeleteUserPermissionsParameters) {
  return post('/api/qualitygates/remove_user', data).catch(throwGlobalError);
}

export function searchUsers(data: SearchPermissionsParameters): Promise<{ users: UserBase[] }> {
  return getJSON('/api/qualitygates/search_users', data).catch(throwGlobalError);
}

export function addGroup(data: AddDeleteGroupPermissionsParameters) {
  return post('/api/qualitygates/add_group', data).catch(throwGlobalError);
}

export function removeGroup(data: AddDeleteGroupPermissionsParameters) {
  return post('/api/qualitygates/remove_group', data).catch(throwGlobalError);
}

export function searchGroups(data: SearchPermissionsParameters): Promise<{ groups: Group[] }> {
  return getJSON('/api/qualitygates/search_groups', data).catch(throwGlobalError);
}
