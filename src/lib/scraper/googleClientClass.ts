import axios, { AxiosRequestConfig } from "axios";
import config from 'config';
export class GoogleClientClass {

    apiKey: string;
    baseUrl: string;
    config: any;

    constructor(parent: any = undefined, typeOfClient: string = 'place') {
        this.apiKey = parent?.apiKey || "";
        this.baseUrl = parent?.baseUrl || "";
        this.config = parent?.config || config;

        this.init();
    }


        
    init() {
        this.initDependencies();
    }
    
    initDependencies() {
        this.apiKey = this.config.get('application.googleKeys.maps.key');   
        this.baseUrl = this.config.get('application.googleKeys.maps.baseUrl');   
    }


    async getPlace(params: any){
        try {
            const options = {
                params: {
                    key: this.apiKey,
                    ...params
                }
            }
            return axios.get(this.baseUrl + '/textsearch/json', options);
        } 
        catch (error) {
            console.log(error);
            return null;
        }
    }   

    getPlaceDetails(placeID: string){
        try {
            const options = {
                params: {
                    key: this.apiKey,
                    place_id: placeID
                }
            }
            return axios.get(this.baseUrl + '/details/json', options);        
        } catch (error) {
            console.log(error);
            return null;
        }
    }



}