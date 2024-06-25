import { RegionData } from "./index.d";
import axios from "axios";
import cheerio from "cheerio";
import { writeResultOnJsonFile } from './utility';
import regioniItaliane from './places/regioniItalianeLista.json';




/* const regioniItaliane = [
    "Toscana"
] */

const regionsData: RegionData[] = [];

const siteUrl = 'https://www.lapesca.it';

async function getSitePage(url = ''): Promise<cheerio.Root | null> {
    if (!url) return null;
    try {
        const response = await axios.get(url);
        if (response.data) {
            const temp = cheerio.load(response.data);
            return temp
        }
        else return null;
    }
    catch (err) {
        console.error("ERROR: ", err)
        return null;
    }
}

async function getRegionsPages(regions: string[] = []) {

    console.log("Getting regions...");

    const arr = (regions.length > 0) ? regions : regioniItaliane;

    let regione = null;

    for (let i = 0; i < arr.length; i++) {
        regione = arr[i];

        const link = siteUrl + `/${regione}`;

        console.log("SEARCHING FOR :", link)

        const page: cheerio.Root | null = await getSitePage(link);


        if (page) {

            const tempRegion: RegionData = {
                id: regione.toLowerCase().split("-").join("_"),
                url: link,
                pages: [page]
            }

            console.log("FOUND FOR :", tempRegion.id.toUpperCase())

            regionsData.push(tempRegion);
        }
        else {
            console.warn("No pages found for this region: " + regione)
        }

    }

}


function getInfoFromPage(page: any = null) {
    if (!page) return null;
    // Select all elements with class "caption"
    const captions = page('.caption');

    const $ = page;

    // Initialize an array to store the extracted objects
    const extractedData: any = [];

    captions.each((_index: any, element: any) => {
        const caption = $(element);

        // Extract name from the ".caption-title" element
        const name: string = caption.find('.caption-title').text().trim();

        // Extract address from the ".caption-text" element
        const address: string = caption.find('.caption-text').text().trim();

        // Extract phone from the "href" attribute of the "a" element with "tel:" in the href
        const phoneElement = caption.find('a[href^="tel:"]');
        const phone: string = phoneElement.attr('href').replace('tel:', '');

        // Create an object and add it to the extractedData array
        const data = {
            name,
            address,
            phone,
        };
        extractedData.push(data);
    });

    return extractedData;
}


function getInfoFromPages(pages: any = null) {
    let result: any = []

    if (!pages || !pages.length) return [];

    let page = null;
    let t = null;
    for (let i = 0; i < pages.length; i++) {

        page = pages[i];

        t = getInfoFromPage(page)

        if (!result.length) result = t;

        else result = [...result, ...t]
    }

    return result;
}

function extractCaptionsInfoFromRegions(pagesByRegion: any = null) {

    const infos: any = {};

    const data = pagesByRegion || regionsData;

    if (!data) return null;

    let regionPages = null;
    let t = null;

    for (let i = 0; i < data.length; i++) {
        regionPages = data[i];
        infos[data[i].id] = getInfoFromPages(regionPages.pages);
    }

    return infos;
}


function extractSubpagesLinks(region: RegionData = null): string[] {

    if (!region) return [];

    let page = region.pages[0];

    const hrefs = new Set(
        page('ul.pagination li a')
            .map((index: any, element: any) => page(element).attr('href'))
            .get()
            .filter((href: any) => href.includes('numpagina')));

    const r: string[] = [];

    hrefs.forEach((href: any) => r.push(href))

    return r;

}


async function extractSubpagesByRegion(region: RegionData = null): Promise<any> {

    if (!region) return null;

    const subPages: string[] = extractSubpagesLinks(region);

    if (!subPages) return null;

    let link: string = '';

    let subPage = null;

    let tempPage = null;

    for (let i = 0; i < subPages.length; i++) {

        subPage = subPages[i];

        console.log("Getting captions from subPage: " + subPage);

        link = siteUrl + subPage;

        tempPage = await getSitePage(link);

        if (tempPage) region.pages.push(tempPage)

    }

}


async function extractPagesForRegions(regions: RegionData[] = []): Promise<any> {

    const arr: RegionData[] = (regions.length) ? regions : regionsData;

    if (!arr) {
        console.warn("[ExtractCaptionsFromRegions] empty regions");
        return null;
    }


    let regionData: RegionData = null;

    for (let i = 0; i < arr.length; i++) {

        regionData = arr[i];

        const id: string = regionData?.id || '';

        if (id) {
            console.log("Getting data from region : " + id.toUpperCase());
            await extractSubpagesByRegion(regionData);
            console.log("Extracted data : " + id.toUpperCase())
        }
    }

}


export async function startWeb(regions: string[] = []) {

    const regs = regions || regioniItaliane;

    await getRegionsPages(regs);

    await extractPagesForRegions();

    const infos = extractCaptionsInfoFromRegions();

    writeResultOnJsonFile(infos)

    console.log(infos);
}


