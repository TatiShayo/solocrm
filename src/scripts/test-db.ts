import { db } from '../lib/db';

async function runTest() {
  console.log('--- Database Verification Script ---');
  
  // Read database contents
  console.log('Reading database...');
  const data = await db.readRaw();
  
  console.log('Seeded database profiles count:', data.profiles.length);
  console.log('Seeded database contacts count:', data.contacts.length);
  console.log('Seeded database pipelines count:', data.pipelines.length);
  console.log('Seeded database stages count:', data.pipeline_stages.length);
  console.log('Seeded database deals count:', data.deals.length);
  console.log('Seeded database timeline events count:', data.deal_timeline.length);
  
  // Verify basic CRUD
  console.log('\nTesting Contact INSERT...');
  const newContact = await db.contacts.insert({
    user_id: 'default-user',
    first_name: 'Test',
    last_name: 'User',
    email: 'test@example.com',
    phone: '123-456-7890',
    company: 'Test Co',
    title: 'Tester',
    source: 'Website',
    tags: ['TestTag'],
    notes: 'This is a test note.',
    is_opted_out: false
  });
  console.log('Inserted contact successfully. ID:', newContact.id);

  console.log('Testing Contact UPDATE...');
  const updatedContact = await db.contacts.update(newContact.id, {
    first_name: 'Test-Updated',
    notes: 'Updated note content.'
  });
  console.log('Updated contact name:', updatedContact?.first_name);
  console.log('Updated contact notes:', updatedContact?.notes);

  console.log('Testing Contact DELETE...');
  const deleteResult = await db.contacts.delete(newContact.id);
  console.log('Delete successful:', deleteResult);

  const checkDeleted = await db.contacts.findById(newContact.id);
  console.log('Contact find after delete (should be null):', checkDeleted);
  
  console.log('\n--- Verification Completed Successfully! ---');
}

runTest().catch(err => {
  console.error('Test failed:', err);
});
