const fs = require("fs");
const path = require("path");

const clientPath = path.join(__dirname);
const files = fs.readdirSync(clientPath);
const exportedModules = {};

files.forEach(file => {
    const filePath = path.join(clientPath, file);
    const stat = fs.statSync(filePath);
    
    // Verifica si es un archivo y si la extensión es .js
    if (stat.isFile() && path.extname(file) === ".js") {
        const moduleName = path.basename(file, ".js");
        const moduleExports = require(filePath);
        
        // Si lo que se exporta es un objeto, itera sus propiedades para añadirlas directamente
        if (typeof moduleExports === "object") {
            for (const key in moduleExports) {
                exportedModules[key] = moduleExports[key];
            }
        } else {
            // Si no es un objeto, lo exporta usando el nombre del archivo
            exportedModules[moduleName] = moduleExports;
        }
    }
});

module.exports = exportedModules;
