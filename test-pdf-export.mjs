// Test PDF export using built-in fetch (Node 18+)

async function testPdfExport() {
  console.log('Testing PDF export endpoint...\n');

  try {
    // First, get a valid course ID from the database
    console.log('Fetching courses...');
    const listResponse = await fetch('http://localhost:3000/api/trpc/course.listAll?input={}', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!listResponse.ok) {
      console.error('Failed to fetch courses:', listResponse.status, listResponse.statusText);
      return;
    }

    const listText = await listResponse.text();
    console.log('Raw response:', listText.substring(0, 200));
    
    const listData = JSON.parse(listText);
    console.log('Parsed response keys:', Object.keys(listData));
    console.log('Response:', JSON.stringify(listData, null, 2).substring(0, 500));
    
    // Handle different response formats
    let courses = [];
    if (listData.result && listData.result.data) {
      // tRPC wraps data in a json property
      if (listData.result.data.json) {
        courses = listData.result.data.json;
      } else if (Array.isArray(listData.result.data)) {
        courses = listData.result.data;
      }
    } else if (Array.isArray(listData)) {
      courses = listData;
    } else if (listData.data) {
      courses = listData.data;
    }

    if (!courses || courses.length === 0) {
      console.log('No courses found in response');
      return;
    }

    const courseId = courses[0].id;
    console.log(`\nFound course ID: ${courseId}`);
    console.log(`Course title: ${courses[0].title}\n`);

    // Now test the PDF export
    console.log(`Testing PDF export for course ${courseId}...`);
    const startTime = Date.now();
    
    const exportResponse = await fetch('http://localhost:3000/api/trpc/course.exportPdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { courseId },
      }),
    });

    const duration = Date.now() - startTime;
    console.log(`Response received in ${duration}ms\n`);

    if (!exportResponse.ok) {
      console.error('PDF export failed:', exportResponse.status, exportResponse.statusText);
      const errorText = await exportResponse.text();
      console.error('Error response:', errorText);
      return;
    }

    const exportText = await exportResponse.text();
    console.log('Export response (first 300 chars):', exportText.substring(0, 300));
    
    const exportData = JSON.parse(exportText);
    
    if (exportData.error) {
      console.error('❌ tRPC error:', exportData.error);
      return;
    }

    if (exportData.result && exportData.result.data) {
      const pdfSize = exportData.result.data.pdf ? Buffer.from(exportData.result.data.pdf, 'base64').length : 0;
      console.log(`\n✅ PDF export successful!`);
      console.log(`   PDF size: ${(pdfSize / 1024).toFixed(2)} KB`);
      console.log(`   Filename: ${exportData.result.data.filename}`);
      console.log(`   Generation time: ${duration}ms`);
    } else {
      console.log('Unexpected response:', JSON.stringify(exportData, null, 2).substring(0, 500));
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

testPdfExport();
