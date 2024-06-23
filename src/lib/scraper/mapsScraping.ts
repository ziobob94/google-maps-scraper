import axios from 'axios';
import * as dotenv from 'dotenv';
import { writeResultOnJsonFile } from './utility';
import * as comuniItaliani from './places/comuniItaliani.json';
import { ShopsDocument, insertData } from './dbManagment';
import mongoose from 'mongoose';
dotenv.config();

const apiKey = process.env.GOOGLE_MAPS_API_KEY; // Sostituisci con la tua chiave API di Google Maps
const baseUrl = 'https://maps.googleapis.com/maps/api/place/textsearch/json';


export async function startMaps({ query = '', latitude, longitude, radius, filter }: any): Promise<any> {

    const searchResultsByRegion: any = {};
    let nextPageToken = null;
    let trovato = false;
    const resultsPerPage = 20; // Numero di risultati per pagina
    let res: any[] = [];

    try {
        while (!trovato) {
            const params: any = {
                location: `${latitude},${longitude}`,
                radius,
                key: apiKey,

                ...(nextPageToken && { pagetoken: nextPageToken }), // Aggiungi il token di paginazione se presente
            };

            //if (level === 'comune') params.radius = 15000;

            const response: any = await axios.get(baseUrl, { params });

            // Elabora la risposta qui
            const t = response.data.results;

            res = [...res, ...t];

            // Ottieni il token di paginazione per la prossima pagina di risultati
            nextPageToken = response.data.next_page_token;

            if (!nextPageToken) trovato = true;

            await new Promise((resolve) => setTimeout(resolve, 2000));
        };
    } catch (error) {
        console.error(`Si è verificato un errore nella ricerca: `, error);
    }

    let shops: any = filter ? res.filter((el) => el.types.includes('store')) : res


    return shops;
}


/**
 * Esegue l'analisi dei dati da Google Maps, ottenendo informazioni sui negozi di pesca.
 * @param {Object} options - Opzioni per l'esecuzione.
 * @param {Object} options.regions - Un oggetto contenente le regioni e i loro dati.
 * @param {string} options.state - Lo stato di riferimento (default: 'Italy').
 * @param {string} options.mode - La modalità di esecuzione (default: 'standard').
 * @param {string} options.level - Il livello di dettaglio (default: 'provincia').
 * @param {boolean} options.skipFinding - Flag per saltare la ricerca e inserire direttamente i dati (default: false).
 * @param {string} options.query - La query per la ricerca (default: '').
 * @returns {Promise<Object>} - Un oggetto contenente i dati estratti da Google Maps.
 */
export async function runMaps({ regions = null, state = 'Italy', mode = 'standard', level = 'provincia', skipFinding = false, query = '' }: any) {
    // Se skipFinding è true, esegui direttamente l'inserimento dei dati
    if (skipFinding) return await insertData();

    // Ottieni le regioni o utilizza quelle predefinite
    const regs = regions || comuniItaliani;
    let regione: string = '';
    let provincia: any = '';
    let province: any[] = [];
    let byMaps: any = {};
    const comuni: string = '';
    let comune: string = '';
    let res: any = {}
    const regioni: string[] = (regs) ? Object.keys(regs) : [];
    let temp: any = {};
    let uuid = '';

    if (mode === 'mongo') {
        try {
            mongoose.connect(`${process.env.MDB_URI}`);
        }
        catch (e) {
            console.error("Database connection failed");
            return null;
        }
    }



    // Ciclo per le regioni
    for (let i = 0; i < regioni.length; i++) {
        regione = regioni[i];
        const regionReplaced = regione.replace(/[^a-zA-Z]+/g, '_').toLowerCase();
        province = (regs[regione]) ? Object.keys(regs[regione]) : [];

        temp[regionReplaced] = {}

        // Ciclo per le province
        for (let j = 0; j < province.length; j++) {
            provincia = province[j];
            const provinceReplaced = provincia.replace(/[^a-zA-Z]+/g, '_').toLowerCase();
            uuid = regs[regione][provincia].uuid;

            temp[regionReplaced][provinceReplaced] = {}


            let tt: any[] = [];

            // Se il livello di dettaglio è "provincia", memorizza i dati in res
            if (level === 'provincia') {
                console.log("Sto ottenendo dati per la regione: " + regione.toUpperCase() + " e provincia " + provincia.toUpperCase() + "\n")

                query += ` provincia ${provincia}`

                // Avvia la ricerca su Google Maps utilizzando startMaps() con la query specificata
                byMaps = await startMaps({ query, filter: false, mode });


                // Effettua trasformazioni e aggiunte ai dati ottenuti da Google Maps
                byMaps.forEach((el: ShopsDocument) => {
                    el.provinciaID = provincia;
                    el.provinciaUUID = uuid;
                    el.state = state;
                    el.regione = regione;
                    tt.push(el);
                })

                byMaps = tt;

                temp[regionReplaced][provinceReplaced] = byMaps;

                res[state] = temp;

                // Se la modalità è "mongo", trasforma e inserisce i dati in un database MongoDB
                if (mode === 'mongo') {
                    res = transformForMongo({ data: res, level, state, province });
                    await insertData(res);
                }

            }
            else if (level === 'comune') {
                temp[regionReplaced][provinceReplaced] = {
                    comuni: {}
                }

                // Ciclo per i comuni
                for (let k = 0; k < regs[regione][provincia]?.comuni?.length; k++) {
                    tt = [];
                    comune = regs[regione][provincia].comuni[k];
                    const comuneReplaced = comune.replace(/[^a-zA-Z]+/g, '_').toLowerCase();

                    temp[regionReplaced][provinceReplaced].comuni[comuneReplaced] = {};

                    query += `, ${comune}, ${uuid}, ${state}`

                    console.log("Sto ottenendo dati per la regione: " + regione.toUpperCase() + "\t Provincia: " + provincia.toUpperCase() + "\t Comune: " + comune.toUpperCase() + "\n")

                    const maps = await startMaps({ query, filter: false, mode, level });

                    if (!maps) continue;

                    byMaps = maps;

                    byMaps.forEach((el: ShopsDocument) => {
                        el.provinciaID = provincia;
                        el.provinciaUUID = uuid;
                        el.state = state;
                        el.regione = regione;
                        el.city = comune;
                        tt.push(el);
                    })

                    byMaps = tt;

                    temp[regionReplaced][provinceReplaced].comuni[comuneReplaced] = byMaps;

                    res[state] = temp;

                    // Se la modalità è "mongo", trasforma e inserisce i dati in un database MongoDB
                    if (mode === 'mongo') {
                        const transformed = transformForMongo({ data: res, level, stateKeyParam: state, regionKeyParam: regionReplaced, provinceKeyParam: provinceReplaced, cityKeyParam: comuneReplaced })
                        await insertData(transformed);
                    }
                }
            }
            console.log(`Provincia ${provincia} scanned successfully\n`);
        }
        console.log(`Regione ${regione} scanned successfully\n`);
    }



    // Se la modalità non è "mongo", scrive i dati in un file JSON
    if (mode === 'mongo') {
        writeResultOnJsonFile(res, 'byMapsMongo');
        mongoose.disconnect();
    }
    else {
        writeResultOnJsonFile(res, 'byMaps');
    }

    // Restituisce l'oggetto contenente i dati estratti
    return res;
}


/**
 * Trasforma i dati per l'inserimento in un database MongoDB.
 * @param {Object} options - Opzioni per la trasformazione.
 * @param {Object} options.data - I dati da trasformare.
 * @param {string} options.level - Il livello di dettaglio (default: 'provincia').
 * @param {string} options.stateKeyParam - Il parametro chiave per lo stato.
 * @param {string} options.regionKeyParam - Il parametro chiave per la regione.
 * @param {string} options.provinceKeyParam - Il parametro chiave per la provincia.
 * @param {string} options.cityKeyParam - Il parametro chiave per la città (comune).
 * @returns {Array} - Un array contenente i dati trasformati pronti per l'inserimento in MongoDB.
 */
function transformForMongo({ data, level = 'provincia', stateKeyParam, regionKeyParam, provinceKeyParam, cityKeyParam }: any) {
    console.log("Transforming data for Mongo");

    let result: any[] = [];

    const statesKeys = [stateKeyParam] || Object.keys(data);
    let regionsKeys = [regionKeyParam] || null;
    let provincesKeys = [provinceKeyParam] || null;
    let region = null;
    let province = null;
    let city: any = null;

    //CICLA SUGLI STATI
    statesKeys.forEach((stateKey) => {

        if (!regionsKeys) regionsKeys = Object.keys(data[stateKey]);
        //CICLA SULLE REGIONI
        regionsKeys.forEach((regionKey) => {

            region = data[stateKey][regionKey];

            if (!provincesKeys) provincesKeys = Object.keys(region);

            //CICLA SULLE PROVINCE
            provincesKeys.forEach((provincesKey) => {

                try {
                    province = data[stateKey][regionKey][provincesKey];

                    if (level === 'comune') {
                        let comuniKeys = [cityKeyParam] || Object.keys(province.comuni);
                        //CICLA SUI COMUNI
                        comuniKeys.forEach((comuneKey) => {
                            city = data[stateKey][regionKey][provincesKey].comuni[comuneKey];
                            result = [...result, ...city];
                        })
                    }
                    else {
                        if (province && typeof province === 'object') result = [...result, ...province];
                    }
                }
                catch (e) {
                }

            })
        })
    })



    return result;
}
