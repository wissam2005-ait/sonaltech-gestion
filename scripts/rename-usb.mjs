// dist-usb/index.html → dist-usb/Sonaltech.html (nom clair pour le client)
import { renameSync, rmSync, readdirSync } from 'node:fs'
renameSync('dist-usb/index.html', 'dist-usb/Sonaltech.html')
for (const f of readdirSync('dist-usb')) if (f !== 'Sonaltech.html') rmSync(`dist-usb/${f}`, { recursive: true, force: true })
console.log('→ dist-usb/Sonaltech.html')
