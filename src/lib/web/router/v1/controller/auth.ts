import { FastifyReply, FastifyRequest } from "fastify";


/**
 * Get user info and save in backend cache
 * @param req 
 * @param res 
 * @param keyv 
 */
export async function getUserInfo(req: FastifyRequest, res: FastifyReply, keyv: any) {
    // if(!req.headers.authorization) {
    //     res.status(401).send({
    //         status: "Unauthorized",
    //         translationKey: "INVALID_TOKEN"
    //     });
    //     return;
    // }
    const info = {
        token: "example_user"
    }
    if (info)
        return res.send(info);
    else
        return res.status(401).send({
            status: "Unauthorized",
            translationKey: "INVALID_TOKEN"
        });
}


/**
 * Verify user token offline with Keycloak's realm public key
 * @param req 
 * @param res 
 */
export async function verifyToken(req: FastifyRequest, res: FastifyReply, keyv: any) {
    try {
        return res.send({});
        return;
        // const reaml = ""; //TODO: Prendere Da config
        // const publicKey = keyv;
        // const header = req.headers.authorization?.replace('Bearer ', '');
        // if(!header) throw new Error('No header');
        // jwt.verify(header, publicKey, {
        //     algorithms: ['RS256']
        // });
        // return res.send({});
    } catch (e) {
        return res.status(401).send({
            status: "Unauthorized",
            translationKey: "INVALID_TOKEN"
        });
    }
}
