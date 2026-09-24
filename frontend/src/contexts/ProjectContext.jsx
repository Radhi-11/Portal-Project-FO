/* eslint-disable react-refresh/only-export-contexts */
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../api/axios';

const ProjectContext = createContext();

export function useProjects() {
  return useContext(ProjectContext);
}

const PROJECTS_CHANGED_EVENT = 'projects:changed';

function dispatchProjectsChanged() {
  window.dispatchEvent(new CustomEvent(PROJECTS_CHANGED_EVENT));
}

export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState('');
  const [projectsPagination, setProjectsPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');

  const [geomapProjects, setGeomapProjects] = useState([]);
  const [geomapLoading, setGeomapLoading] = useState(false);
  const [geomapError, setGeomapError] = useState('');

  const [reportsData, setReportsData] = useState(null);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState('');

  const loadProjects = useCallback(async (params = {}) => {
    try {
      setProjectsLoading(true);
      setProjectsError('');

      const qs = new URLSearchParams();
      qs.set('page', params.page || projectsPagination.page);
      qs.set('limit', params.limit || projectsPagination.limit);
      if (params.search) qs.set('search', params.search);
      if (params.project_type) qs.set('project_type', params.project_type);
      if (params.review_status) qs.set('review_status', params.review_status);

      const res = await api.get(`/projects?${qs.toString()}`);
      setProjects(res.data.data || []);
      setProjectsPagination({
        page: res.data.pagination?.page || 1,
        limit: res.data.pagination?.limit || 20,
        total: res.data.pagination?.total || 0,
        totalPages: res.data.pagination?.totalPages || 1,
      });
    } catch (err) {
      setProjectsError(err.response?.data?.error || 'Failed to load projects.');
    } finally {
      setProjectsLoading(false);
    }
  }, [projectsPagination.page, projectsPagination.limit]);

  const loadProjectSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      setSummaryError('');

      const res = await api.get('/reports/summary');
      setSummary({
        total_projects: res.data.data.summary.total_projects,
        total_value: res.data.data.summary.total_value,
        provinces_count: res.data.data.summary.provinces_count,
        cities_count: res.data.data.summary.cities_count,
        status_distribution: res.data.data.status_distribution,
        projects: res.data.data.projects,
        filters: res.data.data.filters,
      });
    } catch (err) {
      setSummaryError(err.response?.data?.error || 'Failed to load summary.');
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const loadGeomapProjects = useCallback(async () => {
    try {
      setGeomapLoading(true);
      setGeomapError('');

      const res = await api.get(`/projects/geomap/projects`);
      setGeomapProjects(res.data.data || []);
    } catch (err) {
      setGeomapError(
        err.response?.status === 401
          ? 'Please log in to access the geomap.'
          : err.response?.data?.error || 'Failed to load project locations.',
      );
    } finally {
      setGeomapLoading(false);
    }
  }, []);

  const loadReports = useCallback(async (filters = {}) => {
    try {
      setReportsLoading(true);
      setReportsError('');

      const qs = new URLSearchParams();
      Object.entries(filters).forEach(([key, val]) => {
        if (val) qs.set(key, val);
      });

      const res = await api.get(`/reports/summary?${qs.toString()}`);
      setReportsData(res.data.data);
    } catch (err) {
      setReportsError(
        err.response?.status === 401
          ? 'Please log in to access reports.'
          : err.response?.data?.error || 'Failed to load report data.',
      );
    } finally {
      setReportsLoading(false);
    }
  }, []);

  const refreshAll = useCallback(() => {
    dispatchProjectsChanged();
    loadProjects();
    loadProjectSummary();
    loadGeomapProjects();
  }, [loadProjects, loadProjectSummary, loadGeomapProjects]);

  useEffect(() => {
    const handler = () => {
      loadProjects();
      loadProjectSummary();
      loadGeomapProjects();
    };
    window.addEventListener(PROJECTS_CHANGED_EVENT, handler);
    return () => {
      window.removeEventListener(PROJECTS_CHANGED_EVENT, handler);
    };
  }, [loadProjects, loadProjectSummary, loadGeomapProjects]);

  const refreshProjects = useCallback(() => {
    dispatchProjectsChanged();
    loadProjects();
  }, [loadProjects]);

  const refreshReports = useCallback(() => {
    dispatchProjectsChanged();
    loadReports();
  }, [loadReports]);

  return (
    <ProjectContext.Provider
      value={{
        projects,
        projectsLoading,
        projectsError,
        projectsPagination,
        loadProjects,
        refreshProjects,

        summary,
        summaryLoading,
        summaryError,
        loadProjectSummary,

        geomapProjects,
        geomapLoading,
        geomapError,
        loadGeomapProjects,

        reportsData,
        reportsLoading,
        reportsError,
        loadReports,
        refreshReports,

        refreshAll,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}
