import * as http from "http"
import * as joi from "joi"
import * as ecstatic from "ecstatic"
import * as fs from "fs"
import * as open from "open"

const jsonType = "application/json"
const port = 8888
const headers = { "Content-Type": jsonType }

const storage = {
  get: () => require("./.profile.json"),
  save: (data: any) => fs.writeFileSync("./.profile.json", JSON.stringify(data))
}

const schema = joi.object({
  "name": joi.string().min(1).max(100).required().description("full name please"),
  "birthday": joi.date().min(new Date(0)).required().description("when were they born?"),
  "role": joi.string().only("mentor", "entrepreneur").description("would they like to be or get mentoring"),
  "venture": joi.string().description("the venture, optional").optional(),
  "country": joi.string().required().description("what country are they located in"),
  "email": joi.string().email().description("what email is good for them?").required(),
  "phone": joi.string().description("what phone number is good for them?").required(),
  "favorite_color": joi.string().description("what is their favorite color?").required(),
})

const staticFiles = ecstatic({
   root: __dirname + '/public',
    handleError: true,
     cors: true
})

function requestListener(request: http.IncomingMessage, response: http.ServerResponse) {
  if (request.url == "/api/profile" || request.url == "api/pofile/") {
    response.writeHead(404, http.STATUS_CODES[404], headers)
    response.end(JSON.stringify({ ok: false }))
  } else {
    return staticFiles(request, response)
  }

  const methods = ["POST", "GET"]

  if (!methods.some(m => m == request.method)) {
    response.writeHead(405, http.STATUS_CODES[405], headers)
    response.end(JSON.stringify({ ok: false }))
    return
  }

  if (request.headers.accept.toLowerCase() != jsonType) {
    response.writeHead(406, http.STATUS_CODES[406], headers)
    response.end(JSON.stringify({
      ok: false,
      message: `must accept content type '${jsonType}'`
    }))
    return
  }

  if (request.headers["content-type"].toLowerCase() != jsonType) {
    response.writeHead(406, http.STATUS_CODES[406], headers)
    response.write(JSON.stringify({
      ok: false,
      message: `must send content type '${jsonType}', found '${request.headers["content-type"]}`,
    }))
    response.end()
    return
  }

  if (request.method == "GET") {
    response.writeHead(200, http.STATUS_CODES[200], headers)
    response.end(JSON.stringify(storage.get()))
  }

  if (request.method == "POST") {
    const data = []
    request.on("data", (chunk) => data.push(chunk))
    request.on("end", () => {
      const raw = data.map((b: Buffer) => b.toString("UTF-8")).join("")
      try {
        const body = JSON.parse(raw)
        const result = schema.validate(body, { abortEarly: false })
        result.then(() => {
          storage.save(body)
          response.writeHead(201, http.STATUS_CODES[201], headers)
          response.end(JSON.stringify({ ok: true, message: "thanks!" }))
        }).catch(error => {
          console.log(error)
          response.writeHead(400, http.STATUS_CODES[400], headers)
          response.end(JSON.stringify({
            ok: false,
            message: "your request did not pass validation",
            error: error.details
          }))
        })
      } catch (error) {
        response.writeHead(400, http.STATUS_CODES[400])
        response.end(JSON.stringify({ ok: false, message: "invalid json", submitted: raw }))
      }
    })
  }
}


const server = http.createServer(requestListener)

 server.listen(port, () => {
   console.log(`listining on port localhost:${port}`)
   open(`http://localhost:${port}`)
})
