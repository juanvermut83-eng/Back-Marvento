const puntosVentaIniciales = [
    { slug: "aroma-de-vid", nombre: "Aroma de Vid", categoria: "comercio", direccion: "Gral. Roca 2787", localidad: "Mar del Plata", lat: -38.01795, lng: -57.55655 },
    { slug: "sr-v", nombre: "Sr V.", categoria: "comercio", direccion: "Santa Fe 1821", localidad: "Mar del Plata", lat: -37.9999, lng: -57.54745 },
    { slug: "pipita-drinks", nombre: "Pipita Drinks", categoria: "comercio", direccion: "3 de Febrero 3060", localidad: "Mar del Plata", lat: -37.99385, lng: -57.55065 },
    { slug: "di-vino", nombre: "Di Vino", categoria: "comercio", direccion: "Acevedo 4988", localidad: "Mar del Plata", lat: -37.9748, lng: -57.55815 },
    { slug: "saber-beber", nombre: "Saber Beber", categoria: "comercio", direccion: "Fortunato de la Plaza 3460", localidad: "Mar del Plata", lat: -38.05295, lng: -57.5643 },
    { slug: "la-vasca-rivadavia", nombre: "La Vasca", categoria: "comercio", direccion: "Rivadavia 2120", localidad: "Mar del Plata", lat: -38.00425, lng: -57.54495 },
    { slug: "la-vasca-colon", nombre: "La Vasca", categoria: "comercio", direccion: "Av. Colon 1716", localidad: "Mar del Plata", lat: -38.0081, lng: -57.5424 },
    { slug: "bacco", nombre: "Bacco", categoria: "comercio", direccion: "Av. Independencia 2302", localidad: "Mar del Plata", lat: -37.9946, lng: -57.55695 },
    { slug: "cabrales-rivadavia", nombre: "Cabrales", categoria: "comercio", direccion: "Rivadavia 3171", localidad: "Mar del Plata", lat: -37.99195, lng: -57.5511 },
    { slug: "cabrales-alberti", nombre: "Cabrales", categoria: "comercio", direccion: "Alberti 1343", localidad: "Mar del Plata", lat: -38.0122, lng: -57.5361 },
    { slug: "cabrales-constitucion", nombre: "Cabrales", categoria: "comercio", direccion: "Av. Constitucion 4274", localidad: "Mar del Plata", lat: -37.97345, lng: -57.5522 },
    { slug: "cabrales-paseo-aldrey", nombre: "Cabrales", categoria: "comercio", direccion: "Paseo Aldrey, Sarmiento 2685", localidad: "Mar del Plata", lat: -38.00865, lng: -57.5479 },
    { slug: "cabrales-alem", nombre: "Cabrales", categoria: "comercio", direccion: "Alem 3790", localidad: "Mar del Plata", lat: -38.02665, lng: -57.53885 },
    { slug: "cava-mitre", nombre: "Cava Mitre", categoria: "comercio", direccion: "La Rioja 2126", localidad: "Mar del Plata", lat: -37.99815, lng: -57.55295 },
    { slug: "la-artesana", nombre: "La Artesana", categoria: "comercio", direccion: "Av. Constitucion 5674", localidad: "Mar del Plata", lat: -37.95945, lng: -57.56215 },
    { slug: "la-diagonal", nombre: "La Diagonal", categoria: "comercio", direccion: "Lisandro de la Torre 919", localidad: "Mar del Plata", lat: -38.0421, lng: -57.54235 },
    { slug: "de-buena-cepa", nombre: "De Buena Cepa Vinoteca", categoria: "comercio", direccion: "Av. Argentina 100 esq. Aldo", localidad: "Sierra de los Padres", lat: -37.9446, lng: -57.7794 },
    { slug: "sin-nombre", nombre: "Sin Nombre", categoria: "bar", direccion: "Mitre 3121", localidad: "Mar del Plata", lat: -37.9965, lng: -57.5588 },
    { slug: "buchon", nombre: "Buchon", categoria: "bar", direccion: "Almafuerte 215", localidad: "Mar del Plata", lat: -38.03125, lng: -57.53655 },
    { slug: "la-bulonera", nombre: "La Bulonera", categoria: "bar", direccion: "Av. Centenario 1147", localidad: "Balcarce", lat: -37.8463, lng: -58.2558 },
].map((punto, index) => ({ ...punto, orden: index + 1, activo: true, provincia: "Buenos Aires" }));

module.exports = puntosVentaIniciales;
