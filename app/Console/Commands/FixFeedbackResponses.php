<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class FixFeedbackResponses extends Command
{
    protected $signature = 'fix:feedback-responses';
    protected $description = 'Fix double-encoded JSON and normalize follow_up_responses keys';

    public function handle(): void
    {
        $feedbacks = DB::table('feedbacks')->whereNotNull('follow_up_responses')->get();
        $fixed = 0;

        foreach ($feedbacks as $f) {
            $raw = $f->follow_up_responses;
            $decoded = json_decode($raw, true);

            // Fix double-encoded JSON
            if (is_string($decoded)) {
                $decoded = json_decode($decoded, true);
            }

            if (!is_array($decoded)) {
                continue;
            }

            $changed = false;

            // Rename comment to freeText
            if (isset($decoded['comment']) && !isset($decoded['freeText'])) {
                $decoded['freeText'] = $decoded['comment'];
                unset($decoded['comment']);
                $changed = true;
            }

            // Convert old category to selectedOptions
            if (isset($decoded['category']) && !isset($decoded['selectedOptions'])) {
                $decoded['selectedOptions'] = [$decoded['category']];
                unset($decoded['category']);
                $changed = true;
            }

            $properJson = json_encode($decoded);
            if ($properJson !== $raw || $changed) {
                DB::table('feedbacks')->where('id', $f->id)->update(['follow_up_responses' => $properJson]);
                $fixed++;
            }
        }

        $this->info("Fixed: {$fixed} / {$feedbacks->count()} feedbacks");
    }
}
