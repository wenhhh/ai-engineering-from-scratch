// 教学协议夹具：保留请求 id、旧版协议枚举及机器错误，避免将展示翻译混入通信。
export interface Request { jsonrpc:'2.0'; id?:number; method:string; params?:Record<string,unknown> }
export const initialize:Request[]=[];
export async function exchange(_server:string,_requests:Request[],_timeout=3000):Promise<unknown[]> { throw new Error('Stage 5: not implemented yet: typed stdio exchange'); }
