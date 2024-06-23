export type RegionData = {
    id: string,
    url: string,
    pages: any
} | null


export type ScraperArgv = {
    mode: string,
    filter: boolean,
    onlyMaps: boolean,
    skipFinding: boolean,
    level: string,
    query: string
}