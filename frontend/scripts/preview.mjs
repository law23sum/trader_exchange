import { preview } from 'vite'

async function main(){
  const srv = await preview()
  srv.printUrls()
}

main().catch((e)=>{ console.error(e); process.exit(1) })

