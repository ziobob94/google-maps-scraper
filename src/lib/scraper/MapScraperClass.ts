import axios from 'axios';
import { writeResultOnJsonFile } from './utility';
import * as comuniItaliani from './places/comuniItaliani.json';
import { ShopsDocument, insertData } from './dbManagment';
import mongoose from 'mongoose';
import config, { IConfig } from 'config';


export class MapScraperClass {
    config: IConfig;
    apiKey: string;
    baseUrl: string;
    mappaRegioni: any;
    
    constructor(parent: any = undefined) {
        
        this.config = parent?.config || config;
        this.apiKey = ""; // Sostituisci con la tua chiave API di Google Maps
        this.baseUrl = "";
        this.mappaRegioni = comuniItaliani;
        
        
        this.init();    
        
    }
    
    init() {
        this.initDependencies();
    }
    
    initDependencies() {
        this.apiKey = this.config.get('application.googleKeys.maps.key');   
        this.baseUrl = this.config.get('application.googleKeys.maps.baseUrl');   
    }
    
    
    
    async startMaps({ query = '', latitude, longitude, radius, filter }: any): Promise<any> {
        
        const searchResultsByRegion: any = {};
        let nextPageToken = null;
        let trovato = false;
        const resultsPerPage = 20; // Numero di risultati per pagina
        let res: any[] = [];
        
        try {
            while (!trovato) {
                const params: any = {
                    query,
                    location: `${latitude},${longitude}`,
                    radius,
                    key: this.apiKey,
                    
                    ...(nextPageToken && { pagetoken: nextPageToken }), // Aggiungi il token di paginazione se presente
                };
                
                //if (level === 'comune') params.radius = 15000;
                
                const response: any = await axios.get(this.baseUrl, { params });
                
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
    
    
    normalizeName(name: string) {
        return name.replace(/[^a-zA-Z]+/g, '_').toLowerCase();
    }
    
    /**
    * Runs the maps scraper to extract data from Google Maps based on the specified regions, state, mode, and level.
    *
    * @param {Object} options - The options for running the maps scraper.
    * @param {Object} options.regions - An object containing the regions and their data. If not provided, the default Italian regions will be used.
    * @param {string} options.state - The state of reference (default: 'Italy').
    * @param {string} options.mode - The execution mode (default: 'standard').
    * @param {string} options.level - The level of detail (default: 'provincia').
    * @param {boolean} options.skipFinding - Flag to skip the search and directly insert the data (default: false).
    * @param {string} options.query - The query for the search (default: '').
    * @param {boolean} options.writeResult - Flag to write the result to a JSON file (default: false).
    * @return {Promise<Object>} - An object containing the extracted data from Google Maps.
    */
    async runMaps({ regioni = [], province = ['Pisa'], comuni: [], state = 'Italy', mode = 'standard', level = 'provincia', skipFinding = false, query = '', writeResult = true }: any) {
        // Se skipFinding è true, esegui direttamente l'inserimento dei dati
        if (skipFinding) return await insertData();
        
        // Ottieni le regioni o utilizza quelle predefinite
        
        let regione: any = '';
        let provincia: any = '';
        let byMaps: any = {};
        let comune: string = '';
        let res: any = {};
        let temp: any = {};
        let uuid = '';
        let skipProvinceFilter = regioni.length === 0;
        let skipComuniFilter = province.length === 0;
        
        if (writeResult && mode === 'mongo') {
            try {
                mongoose.connect(`${process.env.MDB_URI}`);
            }
            catch (e) {
                console.error("Database connection failed");
                return null;
            }
        }
        
        if(skipProvinceFilter) {
            regioni = Object.keys(comuniItaliani); 
        }
        
        let filteredRegions = regioni.map((el: any) =>  { 
            const normalizedKey = this.normalizeName(el);
            const tempMap : any = this.mappaRegioni[normalizedKey];
            const tempMapEntries = Object.entries(tempMap);
            return { 
                [normalizedKey]: tempMapEntries.map(([k,v] : [string, any]) => {
                    return { [this.normalizeName(k)] : {
                        ...v,
                        'comuni': v.comuni?.map((el: any) => this.normalizeName(el)) || [],
                    } };
                })
            } 
        });
        
        if(!skipProvinceFilter){
            
            filteredRegions = filteredRegions.map((_: any, index: number) => {
                const provinceLocal = filteredRegions[index][Object.keys(filteredRegions[index])[0]];
                const provinceFilteredKeys = provinceLocal.map((prov: any) => Object.keys(prov)[0])
                                        .filter((key: any) => {
                                            return province.map((el : any) => el = this.normalizeName(el)).includes((this.normalizeName(key)));
                                        })

                
                provinceLocal.forEach((key: any) => {
                        const regionName = Object.keys(key)[0];
                        if(!provinceFilteredKeys.includes(regionName)){
                            delete key[regionName];
                        }
                })
                
                return  { [Object.keys(filteredRegions[index])[0]] : provinceLocal.filter((el: any) => Object.keys(el).length > 0) };
                
            })
        }
        
        // Ciclo per le regioni
        for (let i = 0; i < filteredRegions.length; i++) {
            regione = filteredRegions[i];
            let nomeRegione : string = Object.keys(regione)[0];
            
            province =  regione[nomeRegione];
            
            temp[nomeRegione] = {}
            
            // Ciclo per le province
            for (let j = 0; j < province.length; j++) {
                provincia = province[j];
                const nomeProvincia = Object.keys(provincia)[0];
                uuid = provincia[nomeProvincia].uuid;
                
                temp[nomeRegione][nomeProvincia] = {}
                
                
                let tt: any[] = [];
                
                // Se il livello di dettaglio è "provincia", memorizza i dati in res
                if (level === 'provincia') {
                    console.log("Sto ottenendo dati per la regione: " + nomeRegione.toUpperCase() + " e provincia " + nomeProvincia.toUpperCase() + "\n")
                    
                    query = `${query} provincia ${nomeProvincia}`
                    
                    // Avvia la ricerca su Google Maps utilizzando startMaps() con la query specificata
                    byMaps = await this.startMaps({ query, filter: false, mode });
                    
                    
                    // Effettua trasformazioni e aggiunte ai dati ottenuti da Google Maps
                    byMaps.forEach((el: ShopsDocument) => {
                        el.provinciaID = provincia;
                        el.provinciaUUID = uuid;
                        el.state = state;
                        el.regione = regione;
                        tt.push(el);
                    })
                    
                    byMaps = tt;
                    
                    temp[nomeRegione][nomeProvincia] = byMaps;
                    
                    res[state] = temp;
                    
                    // Se la modalità è "mongo", trasforma e inserisce i dati in un database MongoDB
                    if (mode === 'mongo') {
                        res = this.transformForMongo({ data: res, level, state, province });
                        await insertData(res);
                    }
                    
                }
                else if (level === 'comune') {
                    temp[nomeRegione][nomeProvincia] = {
                        comuni: {}
                    }
                    
                    // Ciclo per i comuni
                    for (let k = 0; k < filteredRegions[regione][provincia]?.comuni?.length; k++) {
                        tt = [];
                        comune = filteredRegions[regione][provincia].comuni[k];
                        const comuneReplaced = comune.replace(/[^a-zA-Z]+/g, '_').toLowerCase();
                        
                        temp[nomeRegione][nomeProvincia].comuni[comuneReplaced] = {};
                        
                        query += `, ${comune}, ${uuid}, ${state}`
                        
                        console.log("Sto ottenendo dati per la regione: " + regione.toUpperCase() + "\t Provincia: " + provincia.toUpperCase() + "\t Comune: " + comune.toUpperCase() + "\n")
                        
                        const maps = await this.startMaps({ query, filter: false, mode, level });
                        
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
                        
                        temp[nomeRegione][nomeProvincia].comuni[comuneReplaced] = byMaps;
                        
                        res[state] = temp;
                        
                        // Se la modalità è "mongo", trasforma e inserisce i dati in un database MongoDB
                        if ( writeResult && mode === 'mongo') {
                            const transformed = this.transformForMongo({ data: res, level, stateKeyParam: state, regionKeyParam: nomeRegione, provinceKeyParam: nomeProvincia, cityKeyParam: comuneReplaced })
                            await insertData(transformed);
                        }
                    }
                }
                console.log(`Provincia ${provincia} scanned successfully\n`);
            }
            console.log(`Regione ${regione} scanned successfully\n`);
        }
        
        
        if(writeResult){
            // Se la modalità non è "mongo", scrive i dati in un file JSON
            if (mode === 'mongo') {
                writeResultOnJsonFile(res, 'byMapsMongo');
                mongoose.disconnect();
            }
            else {
                writeResultOnJsonFile(res, 'byMaps');
            }
            
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
    transformForMongo({ data, level = 'provincia', provinces = null , stateKeyParam, regionKeyParam, provinceKeyParam, cityKeyParam }: any) {
        console.log("Transforming data for Mongo");
        
        let result: any[] = [];
        
        const statesKeys = [stateKeyParam] || Object.keys(data);
        let regionsKeys = [regionKeyParam] || null;
        let provincesKeys = [provinceKeyParam] || null;
        let region = null;
        let province = provinces;
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
    
}