const pgp = require('pg-promise')(/* options */)
const db = pgp(process.env.DB_URL)

db.one('SELECT $1 AS value', 123)
    .then((data) => {
        console.log('DATA:', data.value)
    })
    .catch((error) => {
        console.log('ERROR:', error)
    })