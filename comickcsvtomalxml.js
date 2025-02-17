const fs = require('fs');
const csv = require('csv-parser');
const { XMLBuilder } = require('fast-xml-parser');
const readline = require('readline');

// user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// input CSV file path
rl.question('Enter the path to your CSV file: ', (inputCsv) => {
  if (!fs.existsSync(inputCsv)) {
    console.error('Error: File not found');
    rl.close();
    return;
  }
  
  const outputXml = inputCsv.replace(/\.csv$/, '_mal.xml'); // Output XML file name
  const results = [];
  
  // Mapping for status types
  const statusMapping = {
    'Reading': 'Reading',
    'Completed': 'Completed',
    'On-Hold': 'On-Hold',
    'Dropped': 'Dropped',
    'Plan to Read': 'Plan to Read'
  };

  // extract MAL ID from url
  function extractMalId(url) {
    const match = url ? url.match(/manga\/(\d+)/) : null;
    return match ? match[1] : '0'; // Return ID or default to '0'
  }

  // Function to parse date and format it to YYYY-MM-DD
  function parseDate(dateStr) {
    if (!dateStr) return '0000-00-00';
    const formats = [/^(\d{4})-(\d{2})-(\d{2})$/, /^(\d{2})-(\d{2})-(\d{4})$/, /^(\d{2})-(\d{2})-(\d{4})$/];
    for (const fmt of formats) {
      const match = dateStr.match(fmt);
      if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    }
    return '0000-00-00'; // Default if fail
  }

  // Read CSV file
  fs.createReadStream(inputCsv)
    .pipe(csv())
    .on('data', (row) => {
      const malId = extractMalId(row.mal); // Extract MAL ID
      results.push({
        manga_mangadb_id: malId,
        manga_title: `<![CDATA[${row.title}]]>` ,
        manga_volumes: '0',
        manga_chapters: '0',
        my_id: '0',
        my_read_volumes: '0',
        my_read_chapters: row.read || '0',
        my_start_date: parseDate(row.last_read),
        my_finish_date: parseDate(row.last_read),
        my_scanalation_group: '',
        my_score: row.rating || '0',
        my_storage: '',
        my_status: statusMapping[row.type] || 'Plan to Read',
        my_comments: '',
        my_times_read: '0',
        my_tags: '',
        my_reread_value: 'Low',
        update_on_import: '1'
      });
    })
    .on('end', () => {
      // XML structure
      const malXml = {
        myanimelist: {
          myinfo: {
            user_id: '',
            user_name: 'kirbonwashere!',
            user_export_type: '2',
            user_total_manga: results.length.toString(),
            user_total_reading: results.filter(m => m.my_status === 'Reading').length.toString(),
            user_total_completed: results.filter(m => m.my_status === 'Completed').length.toString(),
            user_total_onhold: results.filter(m => m.my_status === 'On-Hold').length.toString(),
            user_total_dropped: results.filter(m => m.my_status === 'Dropped').length.toString(),
            user_total_plantoread: results.filter(m => m.my_status === 'Plan to Read').length.toString()
          },
          manga: results
        }
      };

      // Convert to XML
      const builder = new XMLBuilder({ format: true, ignoreAttributes: false });
      const xmlContent = builder.build(malXml);
      fs.writeFileSync(outputXml, xmlContent);
      console.log(`MAL XML file created successfully: ${outputXml}`);
      rl.close();
    });
});
