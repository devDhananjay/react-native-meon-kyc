const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');
const JavaScriptObfuscator = require('javascript-obfuscator');

console.log('🔨 Starting advanced build process...');

async function build() {
  try {
    // Check if source file exists
    const sourceFile = path.join(__dirname, 'index.js');
    if (!fs.existsSync(sourceFile)) {
      console.error('❌ Error: index.js not found in root directory!');
      process.exit(1);
    }

    // Read source code
    console.log('📖 Reading source file...');
    const sourceCode = fs.readFileSync(sourceFile, 'utf8');

    if (sourceCode.trim().length === 0) {
      console.error('❌ Error: index.js is empty!');
      process.exit(1);
    }

    // Step 1: Transform JSX to JS using Babel
    console.log('⚙️  Transforming JSX to JavaScript...');
    const babelResult = await babel.transformAsync(sourceCode, {
      presets: [
        '@babel/preset-react',
        ['@babel/preset-env', {
          targets: { node: 'current' },
          modules: 'commonjs'
        }]
      ],
      comments: false,
    });

    if (!babelResult || !babelResult.code) {
      throw new Error('Babel transformation failed');
    }

    // Step 2: Obfuscate the transformed code
    console.log('🔐 Obfuscating code...');
    const obfuscationResult = JavaScriptObfuscator.obfuscate(babelResult.code, {
      compact: true,
      controlFlowFlattening: true,
      controlFlowFlatteningThreshold: 0.5,
      deadCodeInjection: true,
      deadCodeInjectionThreshold: 0.3,
      debugProtection: false,
      disableConsoleOutput: false,
      identifierNamesGenerator: 'hexadecimal',
      log: false,
      numbersToExpressions: true,
      renameGlobals: false,
      selfDefending: true,
      simplify: true,
      splitStrings: true,
      splitStringsChunkLength: 10,
      stringArray: true,
      stringArrayCallsTransform: true,
      stringArrayEncoding: ['base64'],
      stringArrayIndexShift: true,
      stringArrayRotate: true,
      stringArrayShuffle: true,
      stringArrayWrappersCount: 2,
      stringArrayWrappersChainedCalls: true,
      stringArrayThreshold: 0.75,
      transformObjectKeys: true,
      unicodeEscapeSequence: false
    });

    // Create dist folder if it doesn't exist
    const distFolder = path.join(__dirname, 'dist');
    if (!fs.existsSync(distFolder)) {
      console.log('📁 Creating dist folder...');
      fs.mkdirSync(distFolder);
    }

    // Save obfuscated code
    const outputFile = path.join(distFolder, 'index.js');
    console.log('💾 Saving obfuscated code...');
    fs.writeFileSync(outputFile, obfuscationResult.getObfuscatedCode());

    // Get file sizes
    const sourceSize = (fs.statSync(sourceFile).size / 1024).toFixed(2);
    const outputSize = (fs.statSync(outputFile).size / 1024).toFixed(2);

    console.log('\n✅ Build completed successfully!');
    console.log('📊 Stats:');
    console.log(`   Source: ${sourceSize} KB`);
    console.log(`   Output: ${outputSize} KB`);
    console.log(`   Location: ${outputFile}`);
    console.log('\n🚀 Ready to publish!');

  } catch (error) {
    console.error('\n❌ Build failed!');
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

build();