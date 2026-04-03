
                            <p className="font-semibold">{item.student_name}</p>
                            <p className="text-xs text-slate-500">{formatDate(item.created_at)}</p>
                          </div>
                          <span className="rounded-full border px-2 py-1 text-xs">
                            {item.feedback_audio_url ? "Feedback sent" : "Needs feedback"}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">{item.prompt_text}</p>
                      </button>
                    );
                  })
                )}

                {teacherError && <AlertBox tone="error">{teacherError}</AlertBox>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Teacher feedback</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {!selectedSubmission ? (
                  <div className="rounded-2xl border p-4 text-sm text-slate-600">
                    Choose a submission from the left.
                  </div>
                ) : (
                  <>
                    <div className="rounded-2xl border p-4">
                      <p className="text-sm text-slate-500">Student</p>
                      <p className="text-xl font-semibold">{selectedSubmission.student_name}</p>
                      <p className="mt-2 text-sm text-slate-600">
                        Submitted: {formatDate(selectedSubmission.created_at)}
                      </p>
                    </div>

                    <div className="rounded-2xl border p-4">
                      <p className="mb-2 font-semibold">Student audio</p>
                      <audio controls src={selectedSubmission.audio_url} className="w-full" />
                    </div>

                    {selectedSubmission.feedback_audio_url && (
                      <div className="rounded-2xl border p-4">
                        <p className="mb-2 font-semibold">Current feedback audio</p>
                        <audio
                          controls
                          src={selectedSubmission.feedback_audio_url}
                          className="w-full"
                        />
                        <p className="mt-2 text-xs text-slate-500">
                          Last feedback: {formatDate(selectedSubmission.feedback_created_at)}
                        </p>
                      </div>
                    )}

                    <div className="rounded-2xl border p-5">
                      <div className="mb-3 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        <p className="font-semibold">Record teacher feedback</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        {!isTeacherRecording ? (
                          <AppButton onClick={startTeacherRecording}>
                            <Mic className="mr-2 h-4 w-4" />
                            Start feedback recording
                          </AppButton>
                        ) : (
                          <AppButton onClick={stopTeacherRecording} variant="destructive">
                            <Square className="mr-2 h-4 w-4" />
                            Stop recording
                          </AppButton>
                        )}
                        <div className="rounded-xl border px-4 py-2 font-mono text-lg">
                          {formatTime(teacherSeconds)}
                        </div>
                      </div>

                      <p className="mt-3 text-sm text-slate-600">{teacherStatusText}</p>

                      {teacherAudioURL && (
                        <div className="mt-5 space-y-4">
                          <audio controls src={teacherAudioURL} className="w-full" />
                          <div className="flex flex-wrap gap-3">
                            <AppButton onClick={clearTeacherRecording} variant="outline">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Clear feedback recording
                            </AppButton>
                          </div>
                        </div>
                      )}
                    </div>

                    <AppButton
                      onClick={uploadTeacherFeedback}
                      disabled={!teacherAudioBlob || !selectedSubmission || isUploadingFeedback}
                      className="h-11 w-full"
                    >
                      {isUploadingFeedback ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading feedback...
                        </>
                      ) : (
                        "Save feedback audio"
                      )}
                    </AppButton>

                    {teacherSuccess && (
                      <AlertBox tone="success">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>{teacherSuccess}</span>
                        </div>
                      </AlertBox>
                    )}

                    {teacherPermissionState === "denied" && (
                      <AlertBox tone="error">
                        Microphone access is blocked. The browser has to allow microphone access for
                        recording feedback.
                      </AlertBox>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
