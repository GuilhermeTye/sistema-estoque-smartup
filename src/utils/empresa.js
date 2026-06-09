export function getEmpresaId() {
  return localStorage.getItem("smartup_empresa");
}

export function getUsuario() {
  const usuario = localStorage.getItem("smartup_usuario");

  if (!usuario) return null;

  return JSON.parse(usuario);
}