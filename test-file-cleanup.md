# File Cleanup Test Plan

This document outlines how to test the file cleanup integrity features.

## Prerequisites

1. Start the development server: `bun run dev`
2. Register a test account
3. Add a test car
4. Create a test repair with photos

## Test 1: Photo Deletion on Repair Deletion

### Setup

1. Navigate to a car's repair list
2. Create a new repair
3. Upload 2-3 photos to the repair
4. Note the repair ID from the URL or browser dev tools

### Test Steps

1. Open the server logs to monitor file deletion
2. Delete the repair from the UI
3. Check the server logs for:
   ```
   Repair deleted { repairId: '...', userId: '...', photosCleaned: 3 }
   Photo file deleted { photoId: '...', path: '...' }
   ```
4. Verify the physical files are deleted:
   ```bash
   ls -la uploads/[user-id]/[repair-id]/
   # Should show "No such file or directory"
   ```

### Expected Results

✅ Repair deleted from database
✅ Photos deleted from database
✅ Physical photo files deleted from disk
✅ No orphaned files remaining
✅ Logs show "photosCleaned: X" count

## Test 2: Photo Deletion on Car Deletion

### Setup

1. Create a car with 2-3 repairs
2. Upload photos to each repair
3. Note the car ID and repair IDs

### Test Steps

1. Open the server logs
2. Delete the car from the UI
3. Check the server logs for:
   ```
   Car deleted {
     carId: '...',
     userId: '...',
     repairsDeleted: 3,
     photosCleaned: 9
   }
   Photo file deleted { photoId: '...', path: '...' }
   ```
4. Verify all photo files are deleted:
   ```bash
   ls -la uploads/[user-id]/
   # Should not contain any repair directories for this car
   ```

### Expected Results

✅ Car deleted from database
✅ All repairs deleted (cascade)
✅ All photos deleted (cascade)
✅ All physical photo files deleted from disk
✅ Logs show total count of cleaned photos

## Test 3: Partial Failure Handling

### Setup

1. Create a repair with photos
2. Manually delete one photo file from disk (simulating corruption)
   ```bash
   rm uploads/[user-id]/[repair-id]/[photo-filename]
   ```

### Test Steps

1. Delete the repair from the UI
2. Check the server logs for warnings:
   ```
   Failed to delete photo file {
     photoId: '...',
     path: '...',
     error: 'ENOENT: no such file or directory'
   }
   ```
3. Verify the repair is still deleted despite file error

### Expected Results

✅ Repair deleted successfully
✅ Warning logged for missing file
✅ Deletion doesn't fail due to missing file
✅ Other files still cleaned up

## Test 4: Cascade Behavior

### Setup

1. Create car → repair → photos chain
2. Note all IDs

### Test Steps

1. Query the database before deletion:

   ```bash
   # Use DB browser or query tool
   SELECT COUNT(*) FROM photos WHERE repair_id = '[repair-id]';
   SELECT COUNT(*) FROM repair_parts WHERE repair_id = '[repair-id]';
   SELECT COUNT(*) FROM repairs WHERE car_id = '[car-id]';
   ```

2. Delete the car

3. Query the database after deletion:
   ```bash
   # All should return 0
   SELECT COUNT(*) FROM photos WHERE repair_id = '[repair-id]';
   SELECT COUNT(*) FROM repair_parts WHERE repair_id = '[repair-id]';
   SELECT COUNT(*) FROM repairs WHERE car_id = '[car-id]';
   SELECT COUNT(*) FROM cars WHERE id = '[car-id]';
   ```

### Expected Results

✅ All related records deleted (cascade working)
✅ No orphaned records in database
✅ All physical files cleaned up
✅ Foreign key constraints maintained

## Test 5: Error Recovery

### Setup

1. Create a repair with photos
2. Make the uploads directory read-only:
   ```bash
   chmod -R 555 uploads/
   ```

### Test Steps

1. Try to delete the repair
2. Check that database deletion succeeds
3. Check logs for file deletion warnings
4. Restore permissions:
   ```bash
   chmod -R 755 uploads/
   ```

### Expected Results

✅ Database deletion succeeds
✅ Warnings logged for file deletion failures
✅ Application doesn't crash
✅ User notified of successful deletion

## Automated Test Script

```bash
#!/bin/bash
# test-cleanup.sh

echo "Testing file cleanup integrity..."

# Test 1: Create and delete repair with photos
echo "Test 1: Repair deletion with photos"
REPAIR_ID=$(curl -X POST http://localhost:5173/api/repairs \
  -H "Content-Type: application/json" \
  -d '{"carId":"...","title":"Test","status":"pending","laborCost":0,"laborHours":0,"totalCost":0,"parts":[]}' \
  | jq -r '.data.id')

echo "Created repair: $REPAIR_ID"

# Upload photo
curl -X POST http://localhost:5173/api/photos \
  -F "repairId=$REPAIR_ID" \
  -F "files=@test-image.jpg"

# Check file exists
ls -la uploads/*/*/$REPAIR_ID/

# Delete repair
curl -X DELETE http://localhost:5173/api/repairs/$REPAIR_ID

# Check file deleted
ls -la uploads/*/*/$REPAIR_ID/ 2>&1 | grep "No such file"

if [ $? -eq 0 ]; then
  echo "✅ Test 1 passed: Files cleaned up"
else
  echo "❌ Test 1 failed: Files not cleaned up"
fi
```

## Manual Verification Checklist

- [ ] Photo files deleted on repair deletion
- [ ] Photo files deleted on car deletion
- [ ] Database cascades working correctly
- [ ] Logs show cleanup operations
- [ ] No orphaned files in uploads directory
- [ ] Partial failures don't stop deletion
- [ ] Promise.allSettled used for cleanup
- [ ] Error warnings logged properly

## Performance Test

For shops with many repairs:

1. Create a car with 50 repairs
2. Add 5 photos to each repair (250 total photos)
3. Delete the car
4. Measure time to complete
5. Verify all 250 files deleted

Expected: Should complete in < 5 seconds

## Monitoring

Add this to your monitoring dashboard:

```javascript
// Check for orphaned files
const findOrphaned = async () => {
	// Get all photo paths from database
	const dbPhotos = await db.select({ path: photos.path }).from(photos);
	const dbPaths = new Set(dbPhotos.map((p) => p.path));

	// Get all files from disk
	const diskFiles = await getAllFilesRecursive('uploads/');

	// Find orphans
	const orphans = diskFiles.filter((f) => !dbPaths.has(f));

	console.log(`Found ${orphans.length} orphaned files`);
	return orphans;
};
```
