import dotenv from 'dotenv'
import express from 'express'
import cookieParser from 'cookie-parser'
import uuid from 'uuid'
import pg from 'pg'
import url from 'url'
import emptygif from 'emptygif'

dotenv.config({silent: true})

// TODO setup warnings for missing env vars?


// Cookie ID

const THE_FUTURE = new Date(2147483647000)
const createCookieId = () => uuid.v4()
const ensureCookieId = (req, res, next) => {
  if (!req.cookies.pixel_cookie_id) {
    const cookieId = createCookieId()
    const params = {
      expires: THE_FUTURE,
      httpOnly: true,
      // TODO Do we care?
      // secure: true,
      domain: process.env.PIXEL_DOMAIN
    }

    res.cookie('pixel_cookie_id', cookieId, params)
    req.cookies.pixel_cookie_id = cookieId
  }
  next()
}


// Storage

const createPool = () => {
  const params = url.parse(process.env.DATABASE_URL)
  const auth = params.auth.split(':')
  const config = {
    user: auth[0],
    password: auth[1],
    host: params.hostname,
    port: params.port,
    database: params.pathname.split('/')[1],
    ssl: true
  }
  return new pg.Pool(config)
}

var pool = createPool()

pool.on('error', (err, client) => {
  console.error('idle client error', err.message, err.stack)
})

const storeHitData = (pixel_cookie_id, url) => {
  if (!pixel_cookie_id) throw "No pixel_cookie_id"
  if (!url) throw "No url"

  const timestamp = new Date()

  pool.connect((err, client, done) => {
    if (err) throw err

    client.query(
      'INSERT INTO hits(pixel_cookie_id, hit_timestamp, url) VALUES ($1, $2, $3)',
      [pixel_cookie_id, timestamp, url],
      (err) => {
        done()
        if (err) throw err
      }
    )
  })
}

const hitHandler = (req, res, next) => {
  storeHitData(req.cookies.pixel_cookie_id, req.originalUrl)
  next()
}


// Response

const pixelResponseHandler = (req, res) => {
  emptygif.sendEmptyGif(req, res, {
    'Content-Type': 'image/gif',
    'Content-Length': emptygif.emptyGifBufferLength,
    'Cache-Control': 'public, max-age=0'
  })
}

const emptyResponseHandler = (req, res) => {
  res.set('Cache-Control', 'private, no-cache, proxy-revalidate, max-age=0')
  res.status(204).send()
}

const jsonResponseHandler = (req, res) => {
  res.set('Cache-Control', 'private, no-cache, proxy-revalidate, max-age=0')
  res.json({status: 'ok'})
}

// Server

const app = express()

app.use(cookieParser())
app.use(ensureCookieId)

app.get('/', (req, res) => {
  res.send('This is a microservice for 3rd party tracking pixels')
})

app.get('/test', (req, res) => {
  res.send(`Your pixel_cookie_id = ${req.cookies.pixel_cookie_id}`)
})

app.get('/test', emptyResponseHandler)
app.get('/test.gif', pixelResponseHandler)
app.get('/test.json', jsonResponseHandler)
app.get('/youtube-impressions.gif', hitHandler, pixelResponseHandler)

const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})
