// convert.js
import bs58 from 'bs58';

const secretKeyArray = [175, 221, 53, 3, 191, 50, 180, 215, 78, 64, 14, 184, 162, 198, 180, 248, 12, 188, 110, 102, 9, 12, 14, 63, 74, 1, 49, 117, 75, 106, 60, 89, 14, 13, 92, 70, 138, 16, 227, 76, 240, 158, 244, 65, 161, 226, 122, 135, 252, 129, 224, 231, 235, 153, 205, 130, 195, 206, 238, 3, 6, 197, 169, 44];

const base58 = bs58.encode(Uint8Array.from(secretKeyArray));
console.log('Base58 PRIVATE_KEY:\n', base58);

