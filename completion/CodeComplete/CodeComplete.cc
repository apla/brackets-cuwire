#include <cstdio>
#include <cstdlib>
#include <clang-c/Index.h>

const char *_getCompleteChunkKindSpelling(CXCompletionChunkKind chunkKind) {
  switch (chunkKind) {
    case CXCompletionChunk_Optional:         return "Optional"; break;
    case CXCompletionChunk_TypedText:        return "TypedText"; break;
    case CXCompletionChunk_Text:             return "Text"; break;
    case CXCompletionChunk_Placeholder:      return "Placeholder"; break;
    case CXCompletionChunk_Informative:      return "Informative"; break;
    case CXCompletionChunk_CurrentParameter: return "CurrentParameter"; break;
    case CXCompletionChunk_LeftParen:        return "LeftParen"; break;
    case CXCompletionChunk_RightParen:       return "RightParen"; break;
    case CXCompletionChunk_LeftBracket:      return "LeftBracket"; break;
    case CXCompletionChunk_RightBracket:     return "RightBracket"; break;
    case CXCompletionChunk_LeftBrace:        return "LeftBrace"; break;
    case CXCompletionChunk_RightBrace:       return "RightBrace"; break;
    case CXCompletionChunk_LeftAngle:        return "LeftAngle"; break;
    case CXCompletionChunk_RightAngle:       return "RightAngle"; break;
    case CXCompletionChunk_Comma:            return "Comma"; break;
    case CXCompletionChunk_ResultType:       return "ResultType"; break;
    case CXCompletionChunk_Colon:            return "Colon"; break;
    case CXCompletionChunk_SemiColon:        return "SemiColon"; break;
    case CXCompletionChunk_Equal:            return "Equal"; break;
    case CXCompletionChunk_HorizontalSpace:  return "HorizontalSpace"; break;
    case CXCompletionChunk_VerticalSpace:    return "VerticalSpace"; break;
    default:                                 return "Unknown"; break;
  }
}

const char *_getCompletionAvailabilitySpelling(CXAvailabilityKind availavility) {
  switch (availavility) {
    case CXAvailability_Available:     return "Available"; break;
    case CXAvailability_Deprecated:    return "Deprecated"; break;
    case CXAvailability_NotAvailable:  return "NotAvailable"; break;
    case CXAvailability_NotAccessible: return "NotAccessible"; break;
    default:                           return "Unknown"; break;
  }
}

const char *_getKindTypeName(CXCursor cursor) {
  CXCursorKind curKind  = clang_getCursorKind(cursor);
  const char *type;
  if (clang_isAttribute(curKind)) {
    type = "Attribute";
  } else if (clang_isDeclaration(curKind)) {
    type = "Declaration";
  } else if (clang_isExpression(curKind)) {
    type = "Expression";
  } else if (clang_isInvalid(curKind)) {
    type = "Invalid";
  } else if (clang_isPreprocessing(curKind)) {
    type = "Preprocessing";
  } else if (clang_isReference(curKind)) {
    type = "Reference";
  } else if (clang_isStatement(curKind)) {
    type = "Statement";
  } else if (clang_isTranslationUnit(curKind)) {
    type = "TranslationUnit";
  } else if (clang_isUnexposed(curKind)) {
    type = "Unexposed";
  } else {
    type = "Unknown";
  }
  return type;
}

void show_completion_results(CXCodeCompleteResults *compResults) {
  printf("=== show results ===\n");
  unsigned isIncomplete;
  CXCursorKind kind = clang_codeCompleteGetContainerKind(compResults, &isIncomplete);
  printf("Complete: %d\n", !isIncomplete);
  CXString kindName = clang_getCursorKindSpelling(kind);
  printf("Kind: %s\n", clang_getCString(kindName));
  clang_disposeString(kindName);

  CXString usr = clang_codeCompleteGetContainerUSR(compResults);
  printf("USR: %s\n", clang_getCString(usr));
  clang_disposeString(usr);

  unsigned long long context = clang_codeCompleteGetContexts(compResults);
  printf("Context: %llu\n", context);
  printf("\n");

  // show completion results
  printf("=== show completion results ===\n");
  printf("CodeCompleationResultsNum: %d\n", compResults->NumResults);
  for (auto i = 0U; i < compResults->NumResults; i++) {
    printf("Results: %d\n", i);
    const CXCompletionResult &result = compResults->Results[i];
    const CXCompletionString &compString = result.CompletionString;
    const CXCursorKind kind = result.CursorKind;

    CXString kindName  = clang_getCursorKindSpelling(kind);
    printf(" Kind: %s\n", clang_getCString(kindName));
    clang_disposeString(kindName);

    CXAvailabilityKind availavility = clang_getCompletionAvailability(compString);
    const char *availavilityText = _getCompletionAvailabilitySpelling(availavility);
    printf(" Availavility: %s\n", availavilityText);

    unsigned priority = clang_getCompletionPriority(compString);
    printf(" Priority: %d\n", priority);

    CXString comment = clang_getCompletionBriefComment(compString);
    printf(" Comment: %s\n", clang_getCString(comment));
    clang_disposeString(comment);

    unsigned numChunks = clang_getNumCompletionChunks(compString);
    printf(" NumChunks: %d\n", numChunks);
    for (auto j = 0U; j < numChunks; j++) {
      CXString chunkText = clang_getCompletionChunkText(compString, j);
      CXCompletionChunkKind chunkKind = clang_getCompletionChunkKind(compString, j);
      printf("   Kind: %s Text: %s\n",
             _getCompleteChunkKindSpelling(chunkKind),
             clang_getCString(chunkText));

      // TODO: check child chunks when CXCompletionChunk_Optional
      // CXCompletionString child = clang_getCompletionChunkCompletionString(compString);
      clang_disposeString(chunkText);
    }

    unsigned numAnnotations = clang_getCompletionNumAnnotations(compString);
    printf(" NumAnnotation: %d\n", numAnnotations);
    for (auto j = 0U; j < numAnnotations; j++) {
      CXString annoText = clang_getCompletionAnnotation(compString, j);
      printf("   Annotation: %s\n", clang_getCString(annoText));
      clang_disposeString(annoText);
    }
    printf("\n");
  }
}

void show_diagnosis(const CXTranslationUnit &tu,
                    CXCodeCompleteResults *compResults) {
  printf("=== show diagnosis ===\n");
  unsigned numDiag = clang_codeCompleteGetNumDiagnostics(compResults);
  printf("NumDiagnosis:%d\n", numDiag);
  for (auto i = 0U; i < numDiag; i++) {
    clang_codeCompleteGetDiagnostic(compResults, i);
    CXDiagnostic diag = clang_getDiagnostic(tu, i);
    CXString diagText = clang_getDiagnosticSpelling(diag);
    printf(" Diagnosis: %s\n", clang_getCString(diagText));
    clang_disposeString(diagText);
  }
}

void show_clang_version(void) {
  CXString version = clang_getClangVersion();
  printf("%s\n", clang_getCString(version));
  clang_disposeString(version);
}

int main(int argc, char **argv) {
  if (argc < 4) {
    printf("CodeComplete filename line column [options ...]\n");
    exit(1);
  }

  show_clang_version();

  const auto filename = argv[1];
  unsigned lineno = atoi(argv[2]);
  unsigned columnno = atoi(argv[3]);
  const auto cmdArgs = &argv[4];
  auto numArgs = argc - 4;

  // create index w/ excludeDeclsFromPCH = 1, displayDiagnostics=1.
  CXIndex index = clang_createIndex(1, 0);

  // create Translation Unit
  CXTranslationUnit tu = clang_parseTranslationUnit(index, filename, cmdArgs, numArgs, NULL, 0, CXTranslationUnit_PrecompiledPreamble | CXTranslationUnit_Incomplete );
  if (tu == NULL) {
    printf("Cannot parse translation unit\n");
    exit(1);
  }

  // Code Completion
  CXCodeCompleteResults *compResults;
  compResults = clang_codeCompleteAt(tu, filename, lineno, columnno,
                                     NULL, 0, clang_defaultCodeCompleteOptions());
  if (compResults == NULL) {
    printf("Invalid\n");
    exit(1);
  }

  // show Completion results
  show_completion_results(compResults);

  // show Diagnosis
  show_diagnosis(tu, compResults);

  clang_disposeCodeCompleteResults(compResults);
  clang_disposeTranslationUnit(tu);
  clang_disposeIndex(index);
  return 0;
}
