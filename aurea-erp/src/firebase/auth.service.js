import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './config'

const DOMINIO_PERMITIDO = 'aureadentalc.com'
const CORREO_ADMIN_FIJO = 'citas@aureadentalc.com'

export function validarCorreoRegistro(correo) {
  const correoNormalizado = correo.trim().toLowerCase()

  if (correoNormalizado === CORREO_ADMIN_FIJO) {
    throw new Error('Esta cuenta ya existe y no puede crearse nuevamente desde el registro')
  }

  if (!correoNormalizado.endsWith(`@${DOMINIO_PERMITIDO}`)) {
    throw new Error(`Solo se permiten correos del dominio @${DOMINIO_PERMITIDO}`)
  }

  return correoNormalizado
}

export async function registrarUsuario({ nombre, telefono, correo, password }) {
  const correoValidado = validarCorreoRegistro(correo)

  const credencial = await createUserWithEmailAndPassword(auth, correoValidado, password)

  await setDoc(doc(db, 'usuarios', credencial.user.uid), {
    nombre,
    telefono,
    correo: correoValidado,
    rol: 'staff',
    creadoEn: serverTimestamp()
  })

  return credencial.user
}

export async function iniciarSesion(correo, password) {
  const credencial = await signInWithEmailAndPassword(auth, correo.trim().toLowerCase(), password)
  return credencial.user
}

export async function cerrarSesion() {
  await signOut(auth)
}

export async function obtenerPerfilUsuario(uid) {
  const referencia = doc(db, 'usuarios', uid)
  const snapshot = await getDoc(referencia)
  return snapshot.exists() ? snapshot.data() : null
}

export function suscribirEstadoAuth(callback) {
  return onAuthStateChanged(auth, callback)
}