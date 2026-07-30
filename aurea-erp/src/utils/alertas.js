import Swal from 'sweetalert2'

const colorConfirmar = '#B08D57'
const colorCancelar = '#8C6D3F'

export function alertaConfirmar({ titulo, texto, textoConfirmar = 'Sí, continuar', textoCancelar = 'Cancelar' }) {
  return Swal.fire({
    title: titulo,
    text: texto,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: colorConfirmar,
    cancelButtonColor: colorCancelar,
    confirmButtonText: textoConfirmar,
    cancelButtonText: textoCancelar,
    reverseButtons: true
  }).then((resultado) => resultado.isConfirmed)
}

export function alertaExito(titulo, texto = '') {
  return Swal.fire({
    title: titulo,
    text: texto,
    icon: 'success',
    confirmButtonColor: colorConfirmar,
    confirmButtonText: 'Aceptar',
    timer: 2200,
    timerProgressBar: true
  })
}

export function alertaError(titulo, texto = '') {
  return Swal.fire({
    title: titulo,
    text: texto,
    icon: 'error',
    confirmButtonColor: colorConfirmar,
    confirmButtonText: 'Entendido'
  })
}

export function alertaInfo(titulo, texto = '') {
  return Swal.fire({
    title: titulo,
    text: texto,
    icon: 'info',
    confirmButtonColor: colorConfirmar,
    confirmButtonText: 'Aceptar'
  })
}

export function alertaCargando(titulo = 'Procesando...') {
  Swal.fire({
    title: titulo,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      Swal.showLoading()
    }
  })
}

export function cerrarAlerta() {
  Swal.close()
}