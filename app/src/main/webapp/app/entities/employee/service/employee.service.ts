import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';

import { isPresent } from 'app/core/util/operators';
import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { IEmployee, getEmployeeIdentifier } from '../employee.model';

export type EntityResponseType = HttpResponse<IEmployee>;
export type EmployeeImageEntityResponseType = HttpResponse<boolean>;
export type EmployeeImageResponseType = HttpResponse<string>;
export type EntityArrayResponseType = HttpResponse<IEmployee[]>;

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  public resourceUrl = this.applicationConfigService.getEndpointFor('api/employees');

  constructor(protected http: HttpClient, private applicationConfigService: ApplicationConfigService) {}

  create(employee: IEmployee): Observable<EntityResponseType> {
    return this.http.post<IEmployee>(this.resourceUrl, employee, { observe: 'response' });
  }

  update(employee: IEmployee): Observable<EntityResponseType> {
    return this.http.put<IEmployee>(`${this.resourceUrl}/${getEmployeeIdentifier(employee) as number}`, employee, { observe: 'response' });
  }

  partialUpdate(employee: IEmployee): Observable<EntityResponseType> {
    return this.http.patch<IEmployee>(`${this.resourceUrl}/${getEmployeeIdentifier(employee) as number}`, employee, {
      observe: 'response',
    });
  }

  find(id: number): Observable<EntityResponseType> {
    return this.http.get<IEmployee>(`${this.resourceUrl}/${id}`, { observe: 'response' });
  }

  query(req?: any): Observable<EntityArrayResponseType> {
    const options = createRequestOption(req);
    return this.http.get<IEmployee[]>(this.resourceUrl, { params: options, observe: 'response' });
  }

  delete(id: number): Observable<HttpResponse<{}>> {
    return this.http.delete(`${this.resourceUrl}/${id}`, { observe: 'response' });
  }

  addEmployeeToCollectionIfMissing(employeeCollection: IEmployee[], ...employeesToCheck: (IEmployee | null | undefined)[]): IEmployee[] {
    const employees: IEmployee[] = employeesToCheck.filter(isPresent);
    if (employees.length > 0) {
      const employeeCollectionIdentifiers = employeeCollection.map(employeeItem => getEmployeeIdentifier(employeeItem)!);
      const employeesToAdd = employees.filter(employeeItem => {
        const employeeIdentifier = getEmployeeIdentifier(employeeItem);
        if (employeeIdentifier == null || employeeCollectionIdentifiers.includes(employeeIdentifier)) {
          return false;
        }
        employeeCollectionIdentifiers.push(employeeIdentifier);
        return true;
      });
      return [...employeesToAdd, ...employeeCollection];
    }
    return employeeCollection;
  }

  saveImage(key: string, croppedImage: File): Observable<EmployeeImageEntityResponseType> {
    const formData = new FormData();
    formData.append('file', croppedImage);
    return this.http.post<boolean>(`${this.resourceUrl}/profileImage/${key}`, formData, { observe: 'response' });
  }

  getImage(key: string): Observable<string> {
    return this.http.get(`${this.resourceUrl}/profileImage/${key}`, { responseType: 'text' });
  }

  deleteImage(employeeId: string): Observable<HttpResponse<boolean>> {
    return this.http.delete<boolean>(`${this.resourceUrl}/profileImage/${employeeId}`, { observe: 'response' });
  }

  upload(file: File, employeeId: string): Observable<HttpEvent<any>> {
    const formData: FormData = new FormData();

    formData.append('file', file);

    const req = new HttpRequest('POST', `${this.resourceUrl}/files/${employeeId}`, formData, {
      reportProgress: true,
      responseType: 'json',
    });

    return this.http.request(req);
  }

  getFiles(employeeId: string): Observable<any> {
    return this.http.get(`${this.resourceUrl}/files/${employeeId}`);
  }
  deleteFile(fileId: string): Observable<any> {
    return this.http.delete(`${this.resourceUrl}/files/${fileId}`);
  }
  downloadFile(fileId: string, fileName: string, s3FileType: string): void {
    this.http
      .get(`${this.resourceUrl}/files/download/${fileId}`, {
        responseType: 'arraybuffer',
      })
      .subscribe(response => this.flushFileToBrowser(response, fileName, s3FileType));
  }

  /**
   * Method is use to download file.
   * @param data - Array Buffer data
   * @param s3FileKey - name of the file downloaded from S3.
   * @param s3FileType - type of the file downloaded from S3.
   */
  flushFileToBrowser(data: any, fileName: string, s3FileType: string): void {
    const aElement = document.createElement('a');
    document.body.appendChild(aElement);

    const blob = new Blob([data], { type: s3FileType });
    const url = window.URL.createObjectURL(blob);

    aElement.href = url;
    aElement.download = fileName;
    aElement.click();
  }
}
