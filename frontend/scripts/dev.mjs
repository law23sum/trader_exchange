import { createServer } from 'vite'

async function main(){
  const server = await createServer()
  await server.listen()
  server.printUrls()
}

main().catch((e)=>{ console.error(e); process.exit(1) })

