import { router } from 'express'
import { register, login, logout, getMe } from '../controllers/auth.controller.js'
import { requireAuth } from '../middleware/auth.js'

// import { validateBody, registerSchema, loginSchema } from '../middleware/validate.js'
// If validation were to be used, it would be required on register and login as follows 
// router.post('/login', validateBody(loginSchema), login)

const router = Router()

router.post('/register', registerSchema, register)
router.post('/login', loginSchema, login)
router.post('logout', logout)

router.get('/me', requireAuth, getMe)

export default router