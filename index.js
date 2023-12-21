// Import the express lirbary
require('dotenv').config()
const express = require('express')
const fs = require('fs');
const jwt = require('jsonwebtoken');

// Import the axios library, to make HTTP requests
const axios = require('axios')
const {Octokit, App} = require("octokit");
const {createAppAuth} = require("@octokit/auth-app");

// This is the client ID and client secret that you obtained
// while registering the application
const clientID = process.env.GITHUB_APP_CLIENT_ID
const clientSecret = process.env.GITHUB_APP_CLIENT_SECRET

// Create a new express application and use
// the express static middleware, to serve all files
// inside the public directory
const app = express()
app.use(express.static(__dirname + '/public'))

async function getJwtToken() {

    try {
        // Read the private key from the file
        const privateKey = fs.readFileSync( process.env.PRIVATE_KEY_PATH);

        // Generate the JWT
        const payload = {
            iat: Math.floor(Date.now() / 1000) - 60, // Issued at time, 60 seconds in the past
            exp: Math.floor(Date.now() / 1000) + (10 * 60), // JWT expiration time (10 minutes)
            iss: process.env.APP_ID, // GitHub App's identifier
        };

        return jwt.sign(payload, privateKey, {algorithm: 'RS256'})
    } catch (error) {
        console.error('Error:', error.message);
    }
}


app.get('/oauth/redirect', (req, res) => {
    // The req.query object has the query params that
    // were sent to this route. We want the `code` param
    const requestToken = req.query.code
    axios({
        // make a POST request
        method: 'post',
        // to the Github authentication API, with the client ID, client secret
        // and request token
        url: `https://github.com/login/oauth/access_token?client_id=${clientID}&client_secret=${clientSecret}&code=${requestToken}`,
        // Set the content type header, so that we get the response in JSOn
        headers: {
            accept: 'application/json'
        }
    }).then((response) => {
        // Once we get the response, extract the access token from
        // the response body
        const accessToken = response.data.access_token
        // redirect the user to the welcome page, along with the access token
        res.redirect(`/welcome.html?access_token=${accessToken}`)
    })
})

app.get('/app/installed',  async (req, res) => {
    const installationId = req.query.installation_id

    //const jwtToken = await getJwtToken()

    const privateKey = fs.readFileSync( process.env.PRIVATE_KEY_PATH);

    const octokit = new Octokit({
        authStrategy: createAppAuth,
        auth: {
            appId: process.env.APP_ID,
            privateKey: privateKey,
            installationId: installationId,
        },
    });

    const {
        data: { slug },
    } = await octokit.rest.apps.getAuthenticated();

   const info = await octokit.rest.issues.create({
        owner: "iamaks1993",
        repo: "oauth-octakit",
        title: "Hello world from " + slug,
    })

    //iamaks1993/oauth-octakit

    console.log(slug, "slug", info)
    return

    res.redirect(`/app-installed.html?installation_id=${installationId}&jwtToken=${jwtToken}`)
})

// Start the server on port 8080
app.listen(8000)
