// // src/api/helper/mongoAuthState.js
// const { randomBytes } = require('crypto');
// const { loadBaileys } = require('./baileys-loader'); // ✅ Use dynamic loader

// async function useMongoDBAuthState(collection) {
//   // Dynamically import Baileys submodules
//   const baileys = await loadBaileys();
//   const proto = baileys.proto || (await import('@whiskeysockets/baileys/WAProto')).proto;
//   const { Curve, signedKeyPair } = baileys.Curve
//     ? baileys
//     : await import('@whiskeysockets/baileys/lib/Utils/crypto');
//   const { generateRegistrationId } = baileys.generateRegistrationId
//     ? baileys
//     : await import('@whiskeysockets/baileys/lib/Utils/generics');

//   // --- Auth Credential Initializer ---
//   const initAuthCreds = () => {
//     const identityKey = Curve.generateKeyPair();
//     return {
//       noiseKey: Curve.generateKeyPair(),
//       signedIdentityKey: identityKey,
//       signedPreKey: signedKeyPair(identityKey, 1),
//       registrationId: generateRegistrationId(),
//       advSecretKey: randomBytes(32).toString('base64'),
//       processedHistoryMessages: [],
//       nextPreKeyId: 1,
//       firstUnuploadedPreKeyId: 1,
//       accountSettings: {
//         unarchiveChats: false,
//       },
//     };
//   };

//   // --- Buffer Serializer ---
//   const BufferJSON = {
//     replacer: (k, value) => {
//       if (
//         Buffer.isBuffer(value) ||
//         value instanceof Uint8Array ||
//         value?.type === 'Buffer'
//       ) {
//         return {
//           type: 'Buffer',
//           data: Buffer.from(value?.data || value).toString('base64'),
//         };
//       }
//       return value;
//     },
//     reviver: (_, value) => {
//       if (
//         typeof value === 'object' &&
//         !!value &&
//         (value.buffer === true || value.type === 'Buffer')
//       ) {
//         const val = value.data || value.value;
//         return typeof val === 'string'
//           ? Buffer.from(val, 'base64')
//           : Buffer.from(val || []);
//       }
//       return value;
//     },
//   };

//   // --- MongoDB read/write helpers ---
//   const writeData = (data, id) => {
//     return collection.replaceOne(
//       { _id: id },
//       JSON.parse(JSON.stringify(data, BufferJSON.replacer)),
//       { upsert: true }
//     );
//   };

//   const readData = async (id) => {
//     try {
//       const data = JSON.stringify(await collection.findOne({ _id: id }));
//       return JSON.parse(data, BufferJSON.reviver);
//     } catch {
//       return null;
//     }
//   };

//   const removeData = async (id) => {
//     try {
//       await collection.deleteOne({ _id: id });
//     } catch {}
//   };

//   // --- Initialize credentials ---
//   const creds = (await readData('creds')) || initAuthCreds();

//   return {
//     state: {
//       creds,
//       keys: {
//         get: async (type, ids) => {
//           const data = {};
//           await Promise.all(
//             ids.map(async (id) => {
//               let value = await readData(`${type}-${id}`);
//               if (type === 'app-state-sync-key' && value) {
//                 value = proto.Message.AppStateSyncKeyData.fromObject(value);
//               }
//               data[id] = value;
//             })
//           );
//           return data;
//         },
//         set: async (data) => {
//           const tasks = [];
//           for (const category of Object.keys(data)) {
//             for (const id of Object.keys(data[category])) {
//               const value = data[category][id];
//               const key = `${category}-${id}`;
//               tasks.push(value ? writeData(value, key) : removeData(key));
//             }
//           }
//           await Promise.all(tasks);
//         },
//       },
//     },
//     saveCreds: () => writeData(creds, 'creds'),
//   };
// }

// module.exports = useMongoDBAuthState;
// src/api/helper/mongoAuthState.js
const { randomBytes } = require('crypto');
const { loadBaileys } = require('./baileys-loader'); // ✅ centralized dynamic import

async function useMongoDBAuthState(collection) {
  const baileys = await loadBaileys();
  const { proto, Curve, signedKeyPair, generateRegistrationId } = baileys;

  if (!proto || !Curve || !signedKeyPair || !generateRegistrationId) {
    throw new Error('Baileys module missing expected exports');
  }

  const initAuthCreds = () => {
    const identityKey = Curve.generateKeyPair();
    return {
      noiseKey: Curve.generateKeyPair(),
      signedIdentityKey: identityKey,
      signedPreKey: signedKeyPair(identityKey, 1),
      registrationId: generateRegistrationId(),
      advSecretKey: randomBytes(32).toString('base64'),
      processedHistoryMessages: [],
      nextPreKeyId: 1,
      firstUnuploadedPreKeyId: 1,
      accountSettings: {
        unarchiveChats: false,
      },
    };
  };

  const BufferJSON = {
    replacer: (k, value) => {
      if (
        Buffer.isBuffer(value) ||
        value instanceof Uint8Array ||
        value?.type === 'Buffer'
      ) {
        return {
          type: 'Buffer',
          data: Buffer.from(value?.data || value).toString('base64'),
        };
      }
      return value;
    },
    reviver: (_, value) => {
      if (
        typeof value === 'object' &&
        !!value &&
        (value.buffer === true || value.type === 'Buffer')
      ) {
        const val = value.data || value.value;
        return typeof val === 'string'
          ? Buffer.from(val, 'base64')
          : Buffer.from(val || []);
      }
      return value;
    },
  };

  const writeData = (data, id) => {
    return collection.replaceOne(
      { _id: id },
      JSON.parse(JSON.stringify(data, BufferJSON.replacer)),
      { upsert: true }
    );
  };

  const readData = async (id) => {
    try {
      const data = JSON.stringify(await collection.findOne({ _id: id }));
      return JSON.parse(data, BufferJSON.reviver);
    } catch {
      return null;
    }
  };

  const removeData = async (id) => {
    try {
      await collection.deleteOne({ _id: id });
    } catch {}
  };

  const creds = (await readData('creds')) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}`);
              if (type === 'app-state-sync-key' && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            })
          );
          return data;
        },
        set: async (data) => {
          const tasks = [];
          for (const category of Object.keys(data)) {
            for (const id of Object.keys(data[category])) {
              const value = data[category][id];
              const key = `${category}-${id}`;
              tasks.push(value ? writeData(value, key) : removeData(key));
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: () => writeData(creds, 'creds'),
  };
}

module.exports = useMongoDBAuthState;
