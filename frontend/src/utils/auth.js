export const setAuthData = (token, user) => {
  sessionStorage.setItem('token', token);
  sessionStorage.setItem('user', JSON.stringify(user));
};

export const clearAuthData = () => {
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
};

export const getToken = () => sessionStorage.getItem('token');

export const getUser = () => {
  const user = sessionStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const isAuthenticated = () => {
  return !!getToken();
};
