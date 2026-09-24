import api from './axios';

export const projectsApi = {
  getTypes: () => api.get('/projects/types'),

  list: (params) => api.get('/projects', { params }),

  get: (id) => api.get(`/projects/${id}`),

  create: (projectData, files) => {
    const formData = new FormData();
    Object.entries(projectData).forEach(([key, value]) => {
      formData.append(key, value);
    });
    if (files.boq) {
      formData.append('boq', files.boq);
    }
    if (files.kmz) {
      formData.append('kmz', files.kmz);
    }
    return api.post('/projects', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  downloadFile: (projectId, fileId) => api.get(`/projects/${projectId}/files/${fileId}/download`, {
    responseType: 'blob',
  }),
};
