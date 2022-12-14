const express = require('express');
const app = express();
const router = express.Router();
require('dotenv').config();
const morgan = require('morgan');
const cors = require('cors');
const deepl = require('deepl-node');
const bodyParser = require('body-parser');
const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
    apiKey: process.env.OPENAI_KEY,
});
const openai = new OpenAIApi(configuration);
const authKey = process.env.DEEPL_KEY; // Replace with your key
const translator = new deepl.Translator(authKey);

app.use(cors());
app.use(express.json());
app.use(morgan('combined'));
app.use(express.static('build'));

const port = process.env.PORT;
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
});

app.use('/image', router);

router.use(bodyParser.json());

function wait5Seconds() {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, 10000);
    });
}

router.post('/', async(req, res, next) => {
    try {
        // Heroku router timeouttaa tän POST Image requestin
        // Timeouttia ei voi säätää
        // Pitää pilkkoa tää whisper request omaan endpointtiin eka
        // sitten pitää pollata toista endpointtia joka tsekkaa whisperin tilanteen ja
        // sitten kun status on succeeded se tekee loput toimenpiteet
        const whisperInitialRes = await fetch("https://api.replicate.com/v1/predictions", {
            headers: {
                'Authorization': `Token ${process.env.WHISPER_TOKEN}`,
                'Content-Type': 'application/json'
            },
            method: 'POST',
            body: JSON.stringify({
                input: { audio: req.body.blobAsB64, language: 'fi', model: 'base' },
                version: "23241e5731b44fcb5de68da8ebddae1ad97c5094d24f94ccb11f7c1d33d661e2",
            })
        });
        const wJson = await whisperInitialRes.json();

        if (wJson.urls && wJson.urls.get) {

            let getPromptUrl;
            while (true) {
                await wait5Seconds();
                let whisperGetRes = await fetch(wJson.urls.get, {
                    headers: {
                        'Authorization': `Token ${process.env.WHISPER_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    method: 'GET',
                });

                getPromptUrl = await whisperGetRes.json()
                console.log(getPromptUrl);

                if (getPromptUrl.status === 'succeeded') break;
                if (getPromptUrl.status === 'failed') throw Error;
            }

            const result = await translator.translateText(getPromptUrl.output.transcription, 'fi', 'en-US');

            const response = await openai.createImage({
                prompt: result.text.charAt(0) === '' ? result.text.substring(1) : result.text,
                n: 1,
                size: "512x512",
            });
            console.log(response);
            const image_url = response.data.data[0].url;
            console.log(image_url);
            res.send({ url: image_url });
        }

    } catch (err) {
        res.status(500).send({ message: 'Error.' });
        next(err);
    }
});