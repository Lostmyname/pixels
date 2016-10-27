import dotenv from 'dotenv'
import express from 'express'
import cookieParser from 'cookie-parser'
import uuid from 'uuid'

dotenv.config({silent: true})

const THE_FUTURE = new Date(2147483647000)

const createCookieId = () => uuid.v4()

const ensureCookieId = (req, res, next) => {
  if (!req.cookies.pixel_cookie_id) {
    res.cookie('pixel_cookie_id', createCookieId(), {expires: THE_FUTURE, httpOnly: true})
  }
  next()
}

const storeHitData = (pixel_cookie_id, url) => {
  console.log(pixel_cookie_id, url)
}

const app = express()

app.use(cookieParser())
app.use(ensureCookieId)

app.get('/test', (req, res) => {
  res.send(`Your pixel_cookie_id = ${req.cookies.pixel_cookie_id}`)
})

app.get('/youtube', (req, res) => {
  storeHitData(req.cookies.pixel_cookie_id, req.originalUrl)
  res.send(`Youtube - Your pixel_cookie_id = ${req.cookies.pixel_cookie_id}; Your url: ${req.originalUrl}`)
})

const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})
